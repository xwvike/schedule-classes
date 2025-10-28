import { cn, countDaysInclusive, getDaysInRange } from '@/lib/utils'
import Header from './components/header'
import DateRangePicker from './components/date-range-picker'
import SchoolSelect from './components/school-select'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import type {
  DragEvent,
  MouseEvent as ReactMouseEvent,
  UIEvent as ReactUIEvent,
} from 'react'
import {
  RotateCw,
  Trash2,
  GitMerge,
  Undo2,
  Redo2,
  Eraser,
  ListChecks,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { RootState } from '@/store/index'
import { projects, teachers } from '@/mock'
import {
  addSchedule,
  addScheduleRaw,
  updateSchedule,
  deleteSchedule,
} from '@/store/editDataReducer'
import { loadProjects, setActiveProjectsByIds } from '@/store/projectsReducer'
import { loadTeachers } from '@/store/teachersReducer'

import {
  addLogEntry,
  undo,
  redo,
  selectCanUndo,
  selectCanRedo,
} from '@/store/editLogReducer'

interface DateRange {
  start: Date | null
  end: Date | null
}

type ScheduleItem = {
  projectId: string
  scheduleId: string
  startDate: number
  endDate: number
  description: string
  teacherId: string
  area: string
}

type EditLogEntry = {
  time: number
  op: 'add' | 'update' | 'delete'
  projectId: string
  scheduleId: string
  before?: ScheduleItem
  after?: ScheduleItem
}

function App() {
  const contentRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const scheduleClassesRef = useRef<HTMLDivElement>(null)
  const timeBarRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [contentHeight, setContentHeight] = useState<number>()
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    }
  })
  const [days, setDays] = useState<
    Array<{ year: number; month: number; day: number }>
  >(getDaysInRange(dateRange.start, dateRange.end))
  const [dragMeta, setDragMeta] = useState<{
    type: 'teacher' | 'schedule' | null
    teacherId?: string
    scheduleId?: string
    sourceProjectId?: string
    durationDays?: number
  }>({ type: null })
  const [preview, setPreview] = useState<{
    visible: boolean
    projectId: string | null
    left: number
    width: number
  }>({ visible: false, projectId: null, left: 0, width: 0 })
  const [resizing, setResizing] = useState<{
    active: boolean
    side: 'left' | 'right' | null
    scheduleId?: string
    projectId?: string
    originalStart?: number
    originalEnd?: number
  }>({ active: false, side: null })
  const dispatch = useDispatch()
  const scheduleData = useSelector(
    (state: RootState) => state.editData.scheduleData
  )
  const projectData = useSelector((state: RootState) => state.projects.projects)
  const teacherData = useSelector((state: RootState) => state.teachers.teachers)

  const prevScheduleDataRef = useRef(scheduleData)
  const isApplyingUndoRedoRef = useRef(false)
  const canUndoAvailable = useSelector(selectCanUndo)
  const canRedoAvailable = useSelector(selectCanRedo)
  const editLog = useSelector((state: RootState) => state.editLog.log)
  const editCursor = useSelector((state: RootState) => state.editLog.cursor)
  const prevCursorRef = useRef(0)
  const ignoreNextApplyCountRef = useRef(0)

  const [selected, setSelected] = useState<Record<string, string>>({})

  const getProjectSelectedIds = (projectId: string) =>
    Object.entries(selected)
      .filter(([, pid]) => pid === projectId)
      .map(([sid]) => sid)

  const toggleSelection = (projectId: string, scheduleId: string) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[scheduleId]) {
        delete next[scheduleId]
      } else {
        next[scheduleId] = projectId
      }
      return next
    })
  }

  const handleDeleteSelectedGlobal = () => {
    if (Object.keys(selected).length === 0) {
      toast.error('未选择任何课程', {
        description: '请先选择要删除的课程卡片',
      })
      return
    }
    const groups = new Map<string, string[]>()
    let deletedCount = 0
    for (const [sid, pid] of Object.entries(selected)) {
      if (!groups.has(pid)) groups.set(pid, [])
      groups.get(pid)!.push(sid)
    }
    for (const [pid, ids] of groups) {
      const entries = scheduleData[pid] || []
      ids.forEach((sid) => {
        const entry = entries.find((e) => e.scheduleId === sid)
        if (entry) {
          dispatch(
            deleteSchedule({
              projectId: pid,
              startDate: entry.startDate,
              endDate: entry.endDate,
              description: entry.description,
              teacherId: entry.teacherId,
              area: entry.area,
              scheduleId: entry.scheduleId,
            })
          )
          deletedCount += 1
        }
      })
    }
    toast.success('删除成功', {
      description: `已删除 ${deletedCount} 条课程`,
    })
    setSelected({})
  }
  const handleMergeSelectedGlobal = () => {
    const selectedIds = Object.keys(selected)
    if (selectedIds.length < 2) {
      toast.error('无法合并', {
        description: '至少选择两条课程卡片',
      })
      return
    }
    const projectIds = new Set(Object.values(selected))
    if (projectIds.size !== 1) {
      toast.error('无法合并', {
        description: '请选择同一项目行的课程卡片进行合并',
      })
      return
    }
    const projectId = Array.from(projectIds)[0] as string
    const ids = getProjectSelectedIds(projectId)
    const entries = (scheduleData[projectId] || []).filter((e) =>
      ids.includes(e.scheduleId)
    )
    if (entries.length < 2) {
      toast.error('无法合并', {
        description: '至少选择两条课程卡片',
      })
      return
    }
    const sameTeacher = entries.every(
      (e) => e.teacherId === entries[0].teacherId
    )
    if (!sameTeacher) {
      toast.error('无法合并', {
        description: '请选择同一位教师的课程进行合并',
      })
      return
    }
    const sorted = [...entries].sort((a, b) => a.startDate - b.startDate)
    const contiguous = sorted.every((e, idx) => {
      if (idx === 0) return true
      const prev = sorted[idx - 1]
      const prevEndDate = new Date(prev.endDate)
      const nextStartDate = new Date(e.startDate)
      const expectedNextStart = new Date(
        prevEndDate.getFullYear(),
        prevEndDate.getMonth(),
        prevEndDate.getDate() + 1
      )
      const actualStart = new Date(
        nextStartDate.getFullYear(),
        nextStartDate.getMonth(),
        nextStartDate.getDate()
      )
      return expectedNextStart.getTime() === actualStart.getTime()
    })
    if (!contiguous) {
      toast.error('无法合并', {
        description: '仅支持对日期连续的课程进行合并',
      })
      return
    }
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    {
      const mergedStart = new Date(first.startDate)
      const mergedEnd = new Date(last.endDate)
      const others = (scheduleData[projectId] || []).filter(
        (e) => !ids.includes(e.scheduleId)
      )
      const conflict = others.some(
        (e) =>
          !(
            mergedEnd.getTime() < e.startDate ||
            mergedStart.getTime() > e.endDate
          )
      )
      if (conflict) {
        toast.error('日期冲突', { description: '与该项目其他安排时间重叠' })
        return
      }
      if (hasTeacherOverlap(first.teacherId, mergedStart, mergedEnd, ids)) {
        toast.error('教师冲突', {
          description: '该教师在这些日期已有其他项目安排',
        })
        return
      }
    }
    dispatch(
      updateSchedule({
        projectId,
        startDate: new Date(first.startDate),
        endDate: new Date(last.endDate),
        description: first.description,
        teacherId: first.teacherId,
        area: first.area,
        scheduleId: first.scheduleId,
      })
    )
    sorted.slice(1).forEach((entry) => {
      dispatch(
        deleteSchedule({
          projectId,
          startDate: entry.startDate,
          endDate: entry.endDate,
          description: entry.description,
          teacherId: entry.teacherId,
          area: entry.area,
          scheduleId: entry.scheduleId,
        })
      )
    })
    toast.success('合并成功', {
      description: `已合并 ${entries.length} 条课程`,
    })
    setSelected({})
  }
  const findTeacher = (id: string) => teacherData.find((t) => t.id === id)
  const hasOverlap = (
    projectId: string,
    start: Date,
    end: Date,
    excludeId?: string
  ): boolean => {
    const entries = scheduleData[projectId] || []
    const s = start.getTime()
    const e = end.getTime()
    return entries.some(
      (it) =>
        (excludeId ? it.scheduleId !== excludeId : true) &&
        !(e < it.startDate || s > it.endDate)
    )
  }
  const hasTeacherOverlap = (
    teacherId: string,
    start: Date,
    end: Date,
    excludeIds?: string[] | string
  ): boolean => {
    const s = start.getTime()
    const e = end.getTime()
    const exclude = new Set(
      Array.isArray(excludeIds) ? excludeIds : excludeIds ? [excludeIds] : []
    )
    for (const pid in scheduleData) {
      const entries = scheduleData[pid] || []
      if (
        entries.some(
          (it) =>
            it.teacherId === teacherId &&
            !exclude.has(it.scheduleId) &&
            !(e < it.startDate || s > it.endDate)
        )
      ) {
        return true
      }
    }
    return false
  }
  const measure = () => {
    const header = headerRef.current
    const toolbar = toolbarRef.current
    if (!contentRef.current) return
    const svh = (() => {
      const el = document.createElement('div')
      el.style.position = 'fixed'
      el.style.height = '100svh'
      el.style.width = '0'
      el.style.visibility = 'hidden'
      document.body.appendChild(el)
      const h = el.getBoundingClientRect().height
      document.body.removeChild(el)
      return h
    })()
    const headerH = header?.getBoundingClientRect().height ?? 0
    const toolbarH = toolbar?.getBoundingClientRect().height ?? 0
    const remPx = parseFloat(
      getComputedStyle(document.documentElement).fontSize || '16'
    )
    const paddingTotal = remPx * 1
    const available = Math.max(
      0,
      Math.floor(svh - headerH - toolbarH - paddingTotal)
    )
    setContentHeight(available)
  }

  const handleScheduleScroll = (e: ReactUIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft

    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      if (timeBarRef.current) {
        timeBarRef.current.style.transform = `translateX(${-scrollLeft}px)`
      }
      rafRef.current = null
    })
  }

  // Drag handlers extracted for reuse
  const COL_WIDTH = 100

  const handleTeacherDragStart = (
    e: DragEvent<HTMLDivElement>,
    teacherId: string
  ) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'teacher', teacherId })
    )
    e.dataTransfer.effectAllowed = 'copy'
    setDragMeta({ type: 'teacher', teacherId, durationDays: 1 })
  }

  const handleScheduleDragStart = (
    e: DragEvent<HTMLDivElement>,
    projectId: string,
    schedule: {
      scheduleId: string
      startDate: number
      endDate: number
      projectId: string
      description: string
      teacherId: string
      area: string
    }
  ) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'schedule',
        scheduleId: schedule.scheduleId,
        projectId,
      })
    )
    e.dataTransfer.effectAllowed = 'move'
    const durationDays = countDaysInclusive(
      new Date(schedule.startDate),
      new Date(schedule.endDate)
    )
    setDragMeta({
      type: 'schedule',
      scheduleId: schedule.scheduleId,
      sourceProjectId: projectId,
      durationDays,
    })
  }

  const handleProjectRowDragOver = (
    e: DragEvent<HTMLDivElement>,
    projectId: string
  ) => {
    e.preventDefault()
    if (resizing.active) return
    if (!dateRange.start || days.length === 0 || !dragMeta.type) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const widthDays = dragMeta.durationDays ?? 1
    let colIndex = Math.floor(x / COL_WIDTH)
    const maxStart = Math.max(1, days.length - widthDays + 1)
    if (colIndex < 1) colIndex = 1
    if (colIndex > maxStart) colIndex = maxStart
    setPreview({
      visible: true,
      projectId,
      left: colIndex * COL_WIDTH,
      width: widthDays * COL_WIDTH,
    })
  }

  const handleProjectRowDragLeave = () => {
    setPreview({ visible: false, projectId: null, left: 0, width: 0 })
  }

  const handleProjectRowDrop = (
    e: DragEvent<HTMLDivElement>,
    projectId: string
  ) => {
    e.preventDefault()
    if (!dateRange.start || days.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let colIndex = Math.floor(x / COL_WIDTH)
    const widthDays = dragMeta.durationDays ?? 1
    const maxStart = Math.max(1, days.length - widthDays + 1)
    if (colIndex < 1) colIndex = 1
    if (colIndex > maxStart) colIndex = maxStart

    if (dragMeta.type === 'teacher' && dragMeta.teacherId) {
      const startDate = new Date(dateRange.start)
      startDate.setDate(startDate.getDate() + (colIndex - 1))
      const endDate = new Date(startDate)
      const teacher = findTeacher(dragMeta.teacherId)
      if (hasOverlap(projectId, startDate, endDate)) {
        toast.error('日期冲突', { description: '该项目在所选日期已有安排' })
      } else if (hasTeacherOverlap(dragMeta.teacherId, startDate, endDate)) {
        toast.error('教师冲突', {
          description: '该教师在所选日期已有其他项目安排',
        })
      } else {
        dispatch(
          addSchedule({
            description: '',
            startDate,
            endDate,
            teacherId: dragMeta.teacherId,
            projectId,
            area: teacher?.location ?? '',
          })
        )
      }
    } else if (dragMeta.type === 'schedule' && dragMeta.scheduleId) {
      // Only adjust start date within the same project row
      if (dragMeta.sourceProjectId !== projectId) {
        setPreview({ visible: false, projectId: null, left: 0, width: 0 })
        setDragMeta({ type: null })
        return
      }
      const entries = scheduleData[projectId] || []
      const current = entries.find((s) => s.scheduleId === dragMeta.scheduleId)
      if (!current) return
      const durationDays =
        dragMeta.durationDays ??
        countDaysInclusive(
          new Date(current.startDate),
          new Date(current.endDate)
        )
      const newStart = new Date(dateRange.start)
      newStart.setDate(newStart.getDate() + (colIndex - 1))
      const newEnd = new Date(newStart)
      newEnd.setDate(newEnd.getDate() + (durationDays - 1))
      if (hasOverlap(projectId, newStart, newEnd, current.scheduleId)) {
        toast.error('日期冲突', { description: '该项目在所选日期已有安排' })
      } else if (
        hasTeacherOverlap(
          current.teacherId,
          newStart,
          newEnd,
          current.scheduleId
        )
      ) {
        toast.error('教师冲突', {
          description: '该教师在所选日期已有其他项目安排',
        })
      } else {
        dispatch(
          updateSchedule({
            projectId,
            startDate: newStart,
            endDate: newEnd,
            description: current.description,
            teacherId: current.teacherId,
            area: current.area,
            scheduleId: current.scheduleId,
          })
        )
      }
    }
    setPreview({ visible: false, projectId: null, left: 0, width: 0 })
    setDragMeta({ type: null })
  }

  // Resize handlers
  const handleResizeMouseDown = (
    e: ReactMouseEvent<HTMLDivElement>,
    side: 'left' | 'right',
    projectId: string,
    schedule: { scheduleId: string; startDate: number; endDate: number }
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing({
      active: true,
      side,
      scheduleId: schedule.scheduleId,
      projectId,
      originalStart: schedule.startDate,
      originalEnd: schedule.endDate,
    })
  }

  const handleRowMouseMove = (
    e: ReactMouseEvent<HTMLDivElement>,
    projectId: string
  ) => {
    if (!resizing.active || resizing.projectId !== projectId) return
    if (!dateRange.start || days.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let colIndex = Math.floor(x / COL_WIDTH)
    if (colIndex < 1) colIndex = 1
    if (colIndex > days.length) colIndex = days.length
    const startIndex = countDaysInclusive(
      dateRange.start,
      new Date(resizing.originalStart!)
    )
    const endIndex = countDaysInclusive(
      dateRange.start,
      new Date(resizing.originalEnd!)
    )
    if (resizing.side === 'left') {
      if (colIndex > endIndex) colIndex = endIndex
      const newStart = new Date(dateRange.start)
      newStart.setDate(newStart.getDate() + (colIndex - 1))
      const widthDays = countDaysInclusive(
        newStart,
        new Date(resizing.originalEnd!)
      )
      setPreview({
        visible: true,
        projectId,
        left: colIndex * COL_WIDTH,
        width: widthDays * COL_WIDTH,
      })
    } else if (resizing.side === 'right') {
      if (colIndex < startIndex) colIndex = startIndex
      const newEnd = new Date(dateRange.start)
      newEnd.setDate(newEnd.getDate() + (colIndex - 1))
      const widthDays = countDaysInclusive(
        new Date(resizing.originalStart!),
        newEnd
      )
      setPreview({
        visible: true,
        projectId,
        left: startIndex * COL_WIDTH,
        width: widthDays * COL_WIDTH,
      })
    }
  }

  const handleRowMouseUp = (
    e: ReactMouseEvent<HTMLDivElement>,
    projectId: string
  ) => {
    if (!resizing.active || resizing.projectId !== projectId) return
    if (!dateRange.start || days.length === 0) {
      setResizing({ active: false, side: null })
      setPreview({ visible: false, projectId: null, left: 0, width: 0 })
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let colIndex = Math.floor(x / COL_WIDTH)
    if (colIndex < 1) colIndex = 1
    if (colIndex > days.length) colIndex = days.length
    const startIndex = countDaysInclusive(
      dateRange.start,
      new Date(resizing.originalStart!)
    )
    const endIndex = countDaysInclusive(
      dateRange.start,
      new Date(resizing.originalEnd!)
    )
    if (resizing.side === 'left' && colIndex > endIndex) colIndex = endIndex
    if (resizing.side === 'right' && colIndex < startIndex)
      colIndex = startIndex

    const entries = scheduleData[projectId] || []
    const current = entries.find((s) => s.scheduleId === resizing.scheduleId)
    if (!current) {
      setResizing({ active: false, side: null })
      setPreview({ visible: false, projectId: null, left: 0, width: 0 })
      return
    }

    let newStartDate = new Date(resizing.originalStart!)
    let newEndDate = new Date(resizing.originalEnd!)
    if (resizing.side === 'left') {
      newStartDate = new Date(dateRange.start)
      newStartDate.setDate(newStartDate.getDate() + (colIndex - 1))
    } else if (resizing.side === 'right') {
      newEndDate = new Date(dateRange.start)
      newEndDate.setDate(newEndDate.getDate() + (colIndex - 1))
    }

    // ensure order
    if (newEndDate.getTime() < newStartDate.getTime()) {
      const tmp = newStartDate
      newStartDate = newEndDate
      newEndDate = tmp
    }

    if (hasOverlap(projectId, newStartDate, newEndDate, current.scheduleId)) {
      toast.error('日期冲突', { description: '该项目在所选日期已有安排' })
    } else if (
      hasTeacherOverlap(
        current.teacherId,
        newStartDate,
        newEndDate,
        current.scheduleId
      )
    ) {
      toast.error('教师冲突', {
        description: '该教师在所选日期已有其他项目安排',
      })
    } else {
      dispatch(
        updateSchedule({
          projectId,
          startDate: newStartDate,
          endDate: newEndDate,
          description: current.description,
          teacherId: current.teacherId,
          area: current.area,
          scheduleId: current.scheduleId,
        })
      )
    }

    setPreview({ visible: false, projectId: null, left: 0, width: 0 })
    setResizing({ active: false, side: null })
  }

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(() => measure())
    if (headerRef.current) ro.observe(headerRef.current)
    if (toolbarRef.current) ro.observe(toolbarRef.current)
    const handle = () => measure()
    window.addEventListener('resize', handle)
    window.addEventListener('orientationchange', handle)
    const id = setTimeout(measure, 0)
    dispatch(loadProjects(projects))
    dispatch(loadTeachers(teachers))
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('orientationchange', handle)
      clearTimeout(id)
      ro.disconnect()
    }
  }, [dispatch])

  useEffect(() => {
    if (timeBarRef.current && scheduleClassesRef.current) {
      timeBarRef.current.style.transform = `translateX(${-scheduleClassesRef.current.scrollLeft}px)`
    }
  }, [days.length])

  // 记录 editData 的变化到编辑日志（忽略撤销/重做导致的变化）
  useEffect(() => {
    if (isApplyingUndoRedoRef.current) {
      prevScheduleDataRef.current = scheduleData
      isApplyingUndoRedoRef.current = false
      return
    }
    const prev = prevScheduleDataRef.current as Record<string, ScheduleItem[]>
    const curr = scheduleData as Record<string, ScheduleItem[]>

    const diffs: EditLogEntry[] = []
    const projectsSet = new Set<string>([
      ...Object.keys(prev || {}),
      ...Object.keys(curr || {}),
    ])

    for (const pid of projectsSet) {
      const prevArr: ScheduleItem[] = (prev && prev[pid]) || []
      const currArr: ScheduleItem[] = (curr && curr[pid]) || []
      const prevMap = new Map<string, ScheduleItem>(
        prevArr.map((e) => [e.scheduleId, e])
      )
      const currMap = new Map<string, ScheduleItem>(
        currArr.map((e) => [e.scheduleId, e])
      )

      // 新增
      for (const [id, e] of currMap) {
        if (!prevMap.has(id)) {
          diffs.push({
            time: Date.now(),
            op: 'add',
            projectId: e.projectId,
            scheduleId: e.scheduleId,
            after: e,
          })
        }
      }
      // 删除
      for (const [id, e] of prevMap) {
        if (!currMap.has(id)) {
          diffs.push({
            time: Date.now(),
            op: 'delete',
            projectId: e.projectId,
            scheduleId: e.scheduleId,
            before: e,
          })
        }
      }
      // 更新
      for (const [id, currE] of currMap) {
        const prevE = prevMap.get(id)
        if (prevE) {
          if (
            prevE.startDate !== currE.startDate ||
            prevE.endDate !== currE.endDate ||
            prevE.teacherId !== currE.teacherId ||
            prevE.area !== currE.area ||
            prevE.description !== currE.description
          ) {
            diffs.push({
              time: Date.now(),
              op: 'update',
              projectId: currE.projectId,
              scheduleId: currE.scheduleId,
              before: prevE,
              after: currE,
            })
          }
        }
      }
    }

    if (diffs.length > 0) {
      diffs.forEach((entry) => {
        dispatch(addLogEntry(entry))
      })
      // 新增日志会推动 cursor 变化，这里标记忽略由此引发的应用
      ignoreNextApplyCountRef.current += diffs.length
    }

    prevScheduleDataRef.current = scheduleData
  }, [scheduleData, dispatch])

  // 撤销/重做游标变化时，实际应用对应操作
  useEffect(() => {
    const prev = prevCursorRef.current
    if (ignoreNextApplyCountRef.current > 0) {
      prevCursorRef.current = editCursor
      ignoreNextApplyCountRef.current -= 1
      return
    }

    const entry: EditLogEntry | undefined =
      editCursor < prev ? editLog[editCursor] : editLog[prev]

    if (!entry) {
      prevCursorRef.current = editCursor
      return
    }

    isApplyingUndoRedoRef.current = true
    if (editCursor < prev) {
      // 撤销：应用 log[cursor] 的逆操作
      switch (entry.op) {
        case 'add': {
          const a = entry.after!
          dispatch(
            deleteSchedule({
              projectId: a.projectId,
              startDate: new Date(a.startDate),
              endDate: new Date(a.endDate),
              description: a.description,
              teacherId: a.teacherId,
              area: a.area,
              scheduleId: a.scheduleId,
            })
          )
          break
        }
        case 'delete': {
          const b = entry.before!
          dispatch(
            addScheduleRaw({
              projectId: b.projectId,
              startDate: b.startDate,
              endDate: b.endDate,
              description: b.description,
              teacherId: b.teacherId,
              area: b.area,
              scheduleId: b.scheduleId,
            })
          )
          break
        }
        case 'update': {
          const b = entry.before!
          dispatch(
            updateSchedule({
              projectId: b.projectId,
              startDate: new Date(b.startDate),
              endDate: new Date(b.endDate),
              description: b.description,
              teacherId: b.teacherId,
              area: b.area,
              scheduleId: b.scheduleId,
            })
          )
          break
        }
      }
    } else if (editCursor > prev) {
      // 重做：应用 log[prev] 的正向操作
      switch (entry.op) {
        case 'add': {
          const a = entry.after!
          dispatch(
            addScheduleRaw({
              projectId: a.projectId,
              startDate: a.startDate,
              endDate: a.endDate,
              description: a.description,
              teacherId: a.teacherId,
              area: a.area,
              scheduleId: a.scheduleId,
            })
          )
          break
        }
        case 'delete': {
          const b = entry.before!
          dispatch(
            deleteSchedule({
              projectId: b.projectId,
              startDate: new Date(b.startDate),
              endDate: new Date(b.endDate),
              description: b.description,
              teacherId: b.teacherId,
              area: b.area,
              scheduleId: b.scheduleId,
            })
          )
          break
        }
        case 'update': {
          const a = entry.after!
          dispatch(
            updateSchedule({
              projectId: a.projectId,
              startDate: new Date(a.startDate),
              endDate: new Date(a.endDate),
              description: a.description,
              teacherId: a.teacherId,
              area: a.area,
              scheduleId: a.scheduleId,
            })
          )
          break
        }
      }
    }
    prevCursorRef.current = editCursor
  }, [editCursor, editLog, dispatch])

  return (
    <div
      className={cn(
        'box-border flex min-h-svh min-w-svw flex-col items-center justify-center overflow-hidden bg-gray-100 p-2'
      )}
    >
      <div
        className={cn(
          'flex w-full flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs'
        )}
      >
        <div ref={headerRef}>
          <Header />
        </div>
        <div
          ref={toolbarRef}
          className={cn('flex items-center gap-4 px-4 py-3')}
        >
          <SchoolSelect />
          <DateRangePicker
            value={dateRange}
            onChange={(next) => {
              setDays(getDaysInRange(next?.start ?? null, next?.end ?? null))
              setDateRange({
                start: next?.start ?? null,
                end: next?.end ?? null,
              })
            }}
          />
          <Button variant="outline" className="cursor-pointer">
            <RotateCw />
            初始化编辑器
          </Button>

          <div className="flex-1"></div>
        </div>
        <div
          ref={contentRef}
          style={{ height: contentHeight ? `${contentHeight}px` : undefined }}
          className={cn('flex w-full overflow-hidden px-4 pb-4')}
        >
          <div
            className={cn(
              'relative flex-1 overflow-hidden rounded-md border border-gray-300 shadow-2xs'
            )}
          >
            <div
              className={cn(
                'flex h-1/3 w-full flex-wrap gap-2 border-b border-gray-300 bg-gray-100 p-4'
              )}
            >
              {teacherData.map((item) => (
                <div
                  draggable="true"
                  onDragStart={(e) => handleTeacherDragStart(e, item.id)}
                  key={item.id}
                  className={cn(
                    'flex h-fit w-fit cursor-move items-center gap-2 rounded-md bg-white p-2 drop-shadow'
                  )}
                >
                  <Avatar>
                    <AvatarImage
                      src={item.avatar || 'https://github.com/shadcn.png'}
                      alt="@shadcn"
                    />
                    <AvatarFallback>{item.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col select-none">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.phone}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className={cn('relative flex h-2/3 w-full overflow-hidden')}>
              <div id="tools" className={cn('w-16 shrink-0 border-r')}>
                <div className="flex h-full w-full flex-col items-center gap-2 p-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-50'
                          )}
                          disabled={!canUndoAvailable}
                          onClick={() => {
                            if (canUndoAvailable) {
                              dispatch(undo())
                            }
                          }}
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">撤销</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-50'
                          )}
                          disabled={!canRedoAvailable}
                          onClick={() => {
                            if (canRedoAvailable) {
                              dispatch(redo())
                            }
                          }}
                        >
                          <Redo2 className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">重做</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-50'
                          )}
                          disabled={Object.keys(selected).length === 0}
                          onClick={() => setSelected({})}
                        >
                          <Eraser className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">清空选择</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-50'
                          )}
                          disabled={false}
                          onClick={() => handleDeleteSelectedGlobal()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">删除选中</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-50'
                          )}
                          disabled={false}
                          onClick={() => handleMergeSelectedGlobal()}
                        >
                          <GitMerge className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">合并选中</TooltipContent>
                    </Tooltip>

                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-50'
                              )}
                            >
                              <ListChecks className="h-4 w-4" />
                            </button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right">选择科目</TooltipContent>
                      </Tooltip>
                      <DialogContent className="w-80">
                        <DialogHeader>
                          <DialogTitle>选择科目</DialogTitle>
                        </DialogHeader>
                        <form
                          className="grid gap-4"
                          onSubmit={(e) => {
                            e.preventDefault()
                            const fd = new FormData(e.currentTarget)
                            const ids = new Set<string>(
                              (fd.getAll('subject') as string[]) ?? []
                            )
                            const selectedList = projects.filter((p) =>
                              ids.has(p.id)
                            )
                            if (selectedList.length === 0) {
                              toast.error('请至少选择一个科目')
                              return
                            }
                            dispatch(setActiveProjectsByIds(Array.from(ids)))
                            toast.success('已更新科目')
                          }}
                        >
                          <div className="grid grid-cols-2 gap-3">
                            {projects.map((s) => {
                              const hid = `hidden-${s.id}`
                              const cid = `subject-${s.id}`
                              const defaultChecked = !!projectData.find(
                                (p) => p.id === s.id
                              )
                              return (
                                <div
                                  key={s.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={cid}
                                    defaultChecked={defaultChecked}
                                    onCheckedChange={(
                                      checked: boolean | 'indeterminate'
                                    ) => {
                                      const input = document.getElementById(
                                        hid
                                      ) as HTMLInputElement | null
                                      if (input) input.checked = !!checked
                                    }}
                                  />
                                  <Label htmlFor={cid} className="truncate">
                                    {s.name}
                                  </Label>
                                  <input
                                    id={hid}
                                    className="hidden"
                                    type="checkbox"
                                    name="subject"
                                    value={s.id}
                                    defaultChecked={defaultChecked}
                                  />
                                </div>
                              )
                            })}
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button" variant="outline">
                                取消
                              </Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button type="submit">保存</Button>
                            </DialogClose>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </TooltipProvider>
                </div>
              </div>
              <div
                className={cn('relative overflow-hidden')}
                style={{ width: 'calc(100% - 4rem)' }}
              >
                <div
                  id="time-bar"
                  ref={timeBarRef}
                  className={cn(
                    'absolute top-0 left-0 grid h-8 border-b border-gray-200'
                  )}
                  style={{
                    gridTemplateColumns: `repeat(${countDaysInclusive(dateRange.start, dateRange.end) + 1}, 100px)`,
                  }}
                >
                  {Array.from({
                    length:
                      countDaysInclusive(dateRange.start, dateRange.end) + 1,
                  }).map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'box-border flex items-end pl-2 text-xs text-gray-400',
                        index > 0 ? 'border-l' : ''
                      )}
                    >
                      {index > 0 && days.length > 0 && (
                        <div className="flex flex-col leading-tight">
                          <span>
                            {days[index - 1]?.month +
                              '月' +
                              days[index - 1]?.day +
                              '日'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {'周' +
                              '日一二三四五六'[
                                new Date(
                                  days[index - 1].year,
                                  days[index - 1].month - 1,
                                  days[index - 1].day
                                ).getDay()
                              ]}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div
                  id="schedule-classes"
                  ref={scheduleClassesRef}
                  className="mt-8 overflow-auto bg-gray-100 pb-4"
                  style={{ height: 'calc(100% - 2rem)' }}
                  onScroll={handleScheduleScroll}
                >
                  {projectData.map((item) => (
                    <div
                      key={item.id}
                      className="relative mt-4 grid h-13"
                      style={{
                        width: `${(days.length + 1) * 100}px`,
                        gridTemplateColumns: `repeat(${days.length + 1}, 100px)`,
                      }}
                      onDrop={(e) => handleProjectRowDrop(e, item.id)}
                      onDragOver={(e) => handleProjectRowDragOver(e, item.id)}
                      onDragLeave={() => handleProjectRowDragLeave()}
                      onDrag={(e) => {
                        e.preventDefault()
                      }}
                      onMouseMove={(e) => handleRowMouseMove(e, item.id)}
                      onMouseUp={(e) => handleRowMouseUp(e, item.id)}
                    >
                      <div className="sticky flex h-13 w-full items-center justify-center">
                        <div
                          className={cn(
                            'flex h-13 w-16 flex-col justify-between rounded-md border-2 border-dashed border-gray-50 bg-white p-1 text-xs'
                          )}
                        >
                          <div className="flex select-none">{item.name}</div>
                        </div>
                      </div>
                      {preview.visible && preview.projectId === item.id && (
                        <div
                          className="pointer-events-none absolute top-0 z-30 h-13 rounded-md border-2 border-dashed border-blue-400"
                          style={{
                            left: preview.left + 'px',
                            width: preview.width + 'px',
                          }}
                        ></div>
                      )}
                      {scheduleData[item.id] &&
                        scheduleData[item.id].map((item) => (
                          <div
                            key={item.scheduleId}
                            draggable="true"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSelection(item.projectId, item.scheduleId)
                            }}
                            onDragStart={(e) =>
                              handleScheduleDragStart(e, item.projectId, item)
                            }
                            className={cn(
                              'absolute top-0 h-13 rounded-md border bg-white shadow-none drop-shadow-xs transition-all hover:shadow-md',
                              selected[item.scheduleId]
                                ? 'z-20 border-blue-500 ring-2 ring-blue-500'
                                : 'z-0 border-transparent',
                              resizing.active &&
                                resizing.scheduleId === item.scheduleId
                                ? 'opacity-60'
                                : ''
                            )}
                            style={{
                              left:
                                countDaysInclusive(
                                  dateRange.start,
                                  new Date(item.startDate)
                                ) *
                                  100 +
                                'px',
                              width:
                                countDaysInclusive(
                                  new Date(item.startDate),
                                  new Date(item.endDate)
                                ) *
                                  100 +
                                'px',
                            }}
                          >
                            <div className="relative flex h-full w-full items-center gap-2 px-2">
                              <div
                                className="absolute top-0 left-0 h-full w-2 cursor-col-resize bg-transparent"
                                onMouseDown={(e) =>
                                  handleResizeMouseDown(
                                    e,
                                    'left',
                                    item.projectId,
                                    item
                                  )
                                }
                              ></div>
                              <Avatar>
                                <AvatarImage
                                  src={
                                    findTeacher(item.teacherId)?.avatar ||
                                    'https://github.com/shadcn.png'
                                  }
                                  alt="@shadcn"
                                />
                                <AvatarFallback>
                                  {findTeacher(item.teacherId)?.name.slice(
                                    0,
                                    1
                                  ) ?? ''}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex min-w-0 flex-col select-none">
                                <div className="truncate text-sm font-medium">
                                  {findTeacher(item.teacherId)?.name}
                                </div>
                                {countDaysInclusive(
                                  new Date(item.startDate),
                                  new Date(item.endDate)
                                ) === 1 ? null : (
                                  <div className="truncate text-xs text-gray-500">
                                    {findTeacher(item.teacherId)?.phone}
                                  </div>
                                )}
                              </div>
                              <div
                                className="absolute top-0 right-0 h-full w-2 cursor-col-resize bg-transparent"
                                onMouseDown={(e) =>
                                  handleResizeMouseDown(
                                    e,
                                    'right',
                                    item.projectId,
                                    item
                                  )
                                }
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
