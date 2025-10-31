import { cn, countDaysInclusive, getDaysInRange } from '@/lib/utils'
import Header from './components/header'
import DateRangePicker from './components/date-range-picker'
import SchoolSelect from './components/school-select'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import type {
  DragEvent,
  MouseEvent as ReactMouseEvent,
  UIEvent as ReactUIEvent,
} from 'react'
import type { CheckedState } from '@radix-ui/react-checkbox'
import { Input } from '@/components/ui/input'
import {
  RotateCw,
  Trash2,
  Undo2,
  Redo2,
  Eraser,
  SquarePen,
  User,
  TableProperties,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import type { RootState } from '@/store/index'
import { teachers, schools, subjects } from '@/mock'
import {
  addSchedule,
  addScheduleRaw,
  updateSchedule,
  deleteSchedule,
} from '@/store/editDataReducer'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { loadProjects } from '@/store/projectsReducer'
import type { Project } from '@/store/projectsReducer'
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

type dateObj = { year: number; month: number; day: number }
type ScheduleItem = {
  projectId: string
  scheduleId: string
  startDate: number
  endDate: number
  description: string
  subjectsId: string
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

// Drag handlers extracted for reuse
const COL_WIDTH = 100

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
  const [selRange, setSelRange] = useState<{
    visible: boolean
    startDate: Date | null
    endDate: Date | null
    projectId: string
    projectTitle: string
    left: number
    width: number
  }>({
    visible: false,
    startDate: null,
    endDate: null,
    projectId: '',
    projectTitle: '',
    left: 0,
    width: 0,
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
  const [scheduleEdit, setScheduleEdit] = useState<{
    visibleEntry: boolean
    visibleEdit: boolean
    scheduleId: string
    subjectsId: string
    teacherId: string
    projectId: string
    projectName: string
    schoolName: string
    startDate: string
    endDate: string
  }>({
    visibleEntry: false,
    visibleEdit: false,
    scheduleId: '',
    subjectsId: '',
    teacherId: '',
    projectId: '',
    projectName: '',
    schoolName: '',
    startDate: '',
    endDate: '',
  })
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

  const handleSelectSchool = (e: string[]) => {
    if (e.length > 0) {
      let projects: Project[] = []
      e.forEach((schoolId) => {
        const school = schools.find((s) => s.value === schoolId)
        const classes = school?.classes.map((c) => {
          return {
            ...c,
            schoolId: school.value,
            schoolName: school.label,
            description: '',
          }
        })
        projects = projects.concat(classes || [])
      })
      dispatch(loadProjects(projects))
    }
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
              subjectsId: entry.subjectsId,
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
            subjectsId: '',
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
            subjectsId: current.subjectsId,
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
          subjectsId: current.subjectsId,
        })
      )
    }

    setPreview({ visible: false, projectId: null, left: 0, width: 0 })
    setResizing({ active: false, side: null })
  }

  const handleSelStart = (date: dateObj, item: Project) => {
    const startDate = new Date(date.year, date.month - 1, date.day)
    setSelRange({
      visible: true,
      startDate,
      endDate: startDate,
      left: countDaysInclusive(dateRange.start, startDate) * 100,
      width: countDaysInclusive(startDate, startDate) * 100,
      projectId: item.id,
      projectTitle: item.name,
    })
  }
  const handleSelMove = (date: dateObj) => {
    const endDate = new Date(date.year, date.month - 1, date.day)
    const startDate = selRange.startDate!
    const minDate = endDate > startDate ? startDate : endDate
    const maxDate = endDate > startDate ? endDate : startDate
    setSelRange({
      ...selRange,
      startDate,
      endDate,
      left: countDaysInclusive(dateRange.start, minDate) * 100,
      width: countDaysInclusive(minDate, maxDate) * 100,
    })
  }
  const handleSelEnd = () => {
    const { startDate, endDate } = selRange
    const minDate = startDate! < endDate! ? startDate : endDate
    const maxDate = startDate! < endDate! ? endDate : startDate
    dispatch(
      addSchedule({
        description: '',
        startDate: new Date(minDate ?? '').getTime(),
        endDate: new Date(maxDate ?? '').getTime(),
        teacherId: '',
        subjectsId: '',
        projectId: selRange.projectId!,
        area: '',
      })
    )
    setSelRange({
      visible: false,
      startDate: null,
      endDate: null,
      left: 0,
      width: 0,
      projectId: '',
      projectTitle: '',
    })
  }

  const handleScheduleSubjects = (checked: CheckedState, id: string) => {
    if (!scheduleEdit.visibleEdit) return
    setScheduleEdit((prev) => ({
      ...prev,
      subjectsId: checked ? id : '',
    }))
    let schedule = scheduleData[scheduleEdit.projectId].find(
      (item) => item.scheduleId === scheduleEdit.scheduleId
    )
    schedule = {
      ...schedule!,
      subjectsId: checked ? id : '',
    }
    dispatch(updateSchedule(schedule!))
  }

  const handleScheduleTeacher = (id: string) => {
    if (!scheduleEdit.visibleEdit) return
    setScheduleEdit((prev) => ({
      ...prev,
      teacherId: id,
    }))
    let schedule = scheduleData[scheduleEdit.projectId].find(
      (item) => item.scheduleId === scheduleEdit.scheduleId
    )
    schedule = {
      ...schedule!,
      teacherId: id,
    }
    dispatch(updateSchedule(schedule!))
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
              subjectsId: a.subjectsId,
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
              subjectsId: b.subjectsId,
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
              subjectsId: b.subjectsId,
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
              subjectsId: a.subjectsId,
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
              subjectsId: b.subjectsId,
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
              subjectsId: a.subjectsId,
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
          <SchoolSelect
            allSchools={schools}
            defaultValue={[]}
            onChange={handleSelectSchool}
          />
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
                'grid h-1/3 w-full grid-cols-2 overflow-hidden border-b border-gray-300 bg-gray-100'
              )}
            >
              <div className="relative overflow-auto border-r border-gray-300">
                <div
                  className={cn(
                    'sticky top-0 left-0 flex w-full items-center gap-2 overflow-hidden rounded-tl-md border-gray-300 bg-white/70 px-2 text-gray-700 backdrop-blur-md transition-all',
                    scheduleEdit.visibleEdit
                      ? 'h-10 border-b'
                      : 'h-0 border-none'
                  )}
                >
                  <TableProperties size={20} />
                  {`请选择（${scheduleEdit.schoolName}）${scheduleEdit.projectName} ${scheduleEdit.startDate} 至 ${scheduleEdit.endDate}安排科目`}
                </div>
                <FieldGroup className="flex flex-row flex-wrap gap-2 p-2 [--radius:9999rem]">
                  {subjects.map((option) => (
                    <FieldLabel
                      htmlFor={option.id}
                      key={option.id}
                      className="w-fit! bg-white"
                    >
                      <Field
                        orientation="horizontal"
                        className="cursor-pointer gap-1.5 overflow-hidden px-3! py-1.5! transition-all duration-100 ease-linear group-has-data-[state=checked]/field-label:px-2!"
                      >
                        <Checkbox
                          value={option.id}
                          id={option.id}
                          onCheckedChange={(checked) =>
                            handleScheduleSubjects(checked, option.id)
                          }
                          checked={scheduleEdit.subjectsId === option.id}
                          className="-ml-6 -translate-x-1 rounded-full bg-white transition-all duration-100 ease-linear data-[state=checked]:ml-0 data-[state=checked]:translate-x-0"
                        />
                        <FieldTitle>{option.name}</FieldTitle>
                      </Field>
                    </FieldLabel>
                  ))}
                </FieldGroup>
              </div>
              <div className="relative overflow-auto">
                <div
                  className={cn(
                    'sticky top-0 left-0 z-30 flex w-full items-center gap-2 overflow-hidden rounded-tr-md border-gray-300 bg-white/70 px-2 text-gray-700 backdrop-blur-md transition-all',
                    scheduleEdit.visibleEdit
                      ? 'h-10 border-b'
                      : 'h-0 border-none'
                  )}
                >
                  <User size={20} />
                  {`请选择（${scheduleEdit.schoolName}）${scheduleEdit.projectName} ${scheduleEdit.startDate} 至 ${scheduleEdit.endDate}安排上课讲师`}
                </div>

                <div className="flex flex-wrap content-start items-start gap-2 p-2">
                  {teacherData.map((item) => (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div
                          key={item.id}
                          onClick={() => handleScheduleTeacher(item.id)}
                          className={cn(
                            'flex h-fit w-fit cursor-pointer items-center gap-2 rounded-full border-3 border-transparent bg-white px-2 py-1 drop-shadow',
                            item.id === scheduleEdit.teacherId
                              ? 'border-blue-500'
                              : ''
                          )}
                        >
                          <Avatar>
                            <AvatarImage
                              src={
                                item.avatar || 'https://github.com/shadcn.png'
                              }
                              alt="@shadcn"
                            />
                            <AvatarFallback>
                              {item.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col select-none">
                            <div className="text-sm font-medium">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.phone}
                            </div>
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto">
                        <div className="flex justify-between gap-4">
                          <Avatar>
                            <AvatarImage
                              src={
                                item.avatar || 'https://github.com/shadcn.png'
                              }
                              alt="@shadcn"
                            />
                            <AvatarFallback>
                              {item.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold">
                              {item.name}
                            </h4>
                            <p className="text-sm">{item.location}</p>
                            <p className="text-sm">{item.phone}</p>
                            <div className="text-muted-foreground text-xs">
                              {item.subject.join(', ')}
                            </div>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>
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
                  {scheduleEdit.visibleEdit && (
                    <div
                      onClickCapture={(e) => {
                        e.stopPropagation()
                        setSelected({})
                        setScheduleEdit({
                          visibleEdit: false,
                          visibleEntry: false,
                          subjectsId: '',
                          teacherId: '',
                          scheduleId: '',
                          projectId: '',
                          projectName: '',
                          schoolName: '',
                          startDate: '',
                          endDate: '',
                        })
                      }}
                      className="absolute top-0 right-0 bottom-0 left-0 z-10 bg-black opacity-30"
                    ></div>
                  )}
                  {projectData.map((item) => (
                    <div
                      key={item.id}
                      className="relative mt-2 grid h-13"
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
                      <div className="sticky top-0 left-0 z-30 flex h-13 w-full items-center justify-center">
                        <div
                          className={cn(
                            'flex h-13 w-22 flex-col rounded-md border-2 border-dashed border-gray-50 bg-white p-1 text-xs shadow-md'
                          )}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mb-1 w-18 flex-nowrap truncate text-xs text-gray-500">
                                {item.schoolName}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{item.schoolName}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="flex select-none">{item.name}</div>
                        </div>
                      </div>
                      {getDaysInRange(dateRange.start, dateRange.end).map(
                        (day, index) => (
                          <div
                            key={index}
                            onMouseDownCapture={() => handleSelStart(day, item)}
                            onMouseOverCapture={() => handleSelMove(day)}
                            onMouseUpCapture={() => handleSelEnd()}
                            className={cn(
                              'h-full w-full cursor-cell',
                              preview.visible
                                ? ''
                                : 'hover:rounded-md hover:border-2 hover:border-dashed hover:border-blue-400'
                            )}
                          ></div>
                        )
                      )}
                      {selRange &&
                        selRange.visible &&
                        selRange.projectId === item.id && (
                          <div
                            className="pointer-events-none absolute top-0 z-30 h-13 rounded-md bg-white transition-all"
                            style={{
                              left: selRange.left + 'px',
                              width: selRange.width + 'px',
                            }}
                          ></div>
                        )}
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
                        scheduleData[item.id].map((schedule) => (
                          <div
                            key={schedule.scheduleId}
                            draggable="true"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSelection(
                                schedule.projectId,
                                schedule.scheduleId
                              )
                            }}
                            onDragStart={(e) =>
                              handleScheduleDragStart(
                                e,
                                schedule.projectId,
                                schedule
                              )
                            }
                            className={cn(
                              'absolute top-0 h-13 overflow-hidden rounded-md border bg-white shadow-none drop-shadow-xs transition-all hover:shadow-md',
                              selected[schedule.scheduleId]
                                ? 'z-20 border-blue-500 ring-2 ring-blue-500'
                                : 'z-0 border-transparent',
                              resizing.active &&
                                resizing.scheduleId === schedule.scheduleId
                                ? 'opacity-60'
                                : ''
                            )}
                            style={{
                              left:
                                countDaysInclusive(
                                  dateRange.start,
                                  new Date(schedule.startDate)
                                ) *
                                  100 +
                                'px',
                              width:
                                countDaysInclusive(
                                  new Date(schedule.startDate),
                                  new Date(schedule.endDate)
                                ) *
                                  100 +
                                'px',
                            }}
                          >
                            <div
                              onMouseOver={() => {
                                if (!scheduleEdit.visibleEdit) {
                                  setScheduleEdit({
                                    visibleEntry: true,
                                    visibleEdit: false,
                                    scheduleId: schedule.scheduleId,
                                    subjectsId: '',
                                    teacherId: '',
                                    projectId: '',
                                    projectName: '',
                                    schoolName: '',
                                    startDate: '',
                                    endDate: '',
                                  })
                                }
                              }}
                              onMouseOut={() => {
                                if (!scheduleEdit.visibleEdit) {
                                  setScheduleEdit({
                                    visibleEntry: false,
                                    visibleEdit: false,
                                    scheduleId: '',
                                    subjectsId: '',
                                    teacherId: '',
                                    projectId: '',
                                    projectName: '',
                                    schoolName: '',
                                    startDate: '',
                                    endDate: '',
                                  })
                                }
                              }}
                              className="relative h-full w-full overflow-hidden"
                            >
                              <div
                                className="absolute top-0 left-0 h-full w-2 cursor-col-resize bg-transparent"
                                onMouseDown={(e) =>
                                  handleResizeMouseDown(
                                    e,
                                    'left',
                                    schedule.projectId,
                                    schedule
                                  )
                                }
                              ></div>
                              <div
                                className={cn(
                                  'pointer-events-none flex h-full w-full items-center gap-2 px-2'
                                )}
                              >
                                {schedule.subjectsId && (
                                  <Badge className="bg-blue-500 text-white dark:bg-blue-600">
                                    {
                                      subjects.find(
                                        (subject) =>
                                          subject.id === schedule.subjectsId
                                      )?.name
                                    }
                                  </Badge>
                                )}
                                {schedule.teacherId && (
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-0 border-l"></div>
                                    <Avatar>
                                      <AvatarImage
                                        src={
                                          findTeacher(schedule.teacherId)
                                            ?.avatar ||
                                          'https://github.com/shadcn.png'
                                        }
                                        alt="@shadcn"
                                      />
                                      <AvatarFallback>
                                        {findTeacher(
                                          schedule.teacherId
                                        )?.name.slice(0, 1) ?? ''}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-col select-none">
                                      <div className="truncate text-sm font-medium">
                                        {findTeacher(schedule.teacherId)?.name}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div
                                className="absolute top-0 right-0 h-full w-2 cursor-col-resize bg-transparent"
                                onMouseDown={(e) =>
                                  handleResizeMouseDown(
                                    e,
                                    'right',
                                    schedule.projectId,
                                    schedule
                                  )
                                }
                              ></div>
                              {selected[schedule.scheduleId] &&
                                scheduleEdit.visibleEntry &&
                                scheduleEdit.scheduleId ===
                                  schedule.scheduleId && (
                                  <div
                                    className={cn(
                                      'absolute top-0 left-0 flex h-full w-full items-center justify-center bg-black/30'
                                    )}
                                  >
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setScheduleEdit({
                                          visibleEntry: false,
                                          visibleEdit: true,
                                          scheduleId: schedule.scheduleId,
                                          teacherId: schedule.teacherId,
                                          subjectsId: schedule.subjectsId,
                                          projectId: schedule.projectId,
                                          projectName: item.name,
                                          schoolName: item.schoolName,
                                          startDate: dayjs(
                                            schedule.startDate
                                          ).format('MM-DD'),
                                          endDate: dayjs(
                                            schedule.endDate
                                          ).format('MM-DD'),
                                        })
                                      }}
                                      size="sm"
                                    >
                                      <SquarePen />
                                      编辑
                                    </Button>
                                  </div>
                                )}
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
