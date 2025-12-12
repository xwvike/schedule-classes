import {
  cn,
  countDaysInclusive,
  getDaysInRange,
  randomString,
} from '@/lib/utils'
import Header from './components/header'
import ScrollText from './components/scroll-text'
import DateRangePicker, {
  type DateRangeValue,
} from './components/date-range-picker'
import SchoolSelect from './components/school-select'
import type { school } from './components/school-select'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import type {
  DragEvent,
  MouseEvent as ReactMouseEvent,
  UIEvent as ReactUIEvent,
} from 'react'
import type { CheckedState } from '@radix-ui/react-checkbox'
import {
  Trash2,
  Undo2,
  Redo2,
  Eraser,
  SquarePen,
  User,
  TableProperties,
  ChartNoAxesGantt,
  Plus,
} from 'lucide-react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { RootState } from '@/store/index'
import { teachers, schools, subjects, teacherSchedule } from '@/mock'
import {
  addSchedule,
  addScheduleRaw,
  updateSchedule,
  deleteSchedule,
  deleteProjectSchedules,
} from '@/store/editDataReducer'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import {
  addProject,
  removeProject,
  updateProject,
} from '@/store/projectsReducer'
import type { Project } from '@/store/projectsReducer'
import { loadTeachers } from '@/store/teachersReducer'
import type { Teacher } from '@/store/teachersReducer'

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

type ScheduleEditState = {
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
  startTimestamp: number | null
  endTimestamp: number | null
}

type ScheduleDataMap = Record<string, ScheduleItem[]>

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

type TimeBarProps = {
  days: Array<{ year: number; month: number; day: number }>
  dateRange: DateRange
  onAddCourse: () => void
  onOpenDay: (day: dateObj | null) => void
  onShift: (
    scope: 'before' | 'after',
    direction: 'forward' | 'backward',
    amount: number
  ) => void
}

type SubjectSelectorProps = {
  renderSubject: typeof subjects
  scheduleEdit: ScheduleEditState
  onSelect: (checked: CheckedState, id: string) => void
}

type TeacherSelectorProps = {
  teacherData: Teacher[]
  scheduleEdit: ScheduleEditState
  onSelect: (id: string) => void
  dateRange: DateRange
  scheduleData: ScheduleDataMap
}

type TeacherOptionProps = {
  item: Teacher
  selected: boolean
  onSelect: (id: string) => void
  scheduleEdit: ScheduleEditState
  dateRange: DateRange
  scheduleData: ScheduleDataMap
}

const TimeBar = memo(
  forwardRef<HTMLDivElement, TimeBarProps>(function TimeBar(
    { days, dateRange, onAddCourse, onOpenDay, onShift },
    ref
  ) {
    const columnCount = countDaysInclusive(dateRange.start, dateRange.end) + 1

    return (
      <div
        id="time-bar"
        ref={ref}
        className={cn(
          'absolute top-0 left-0 grid h-8 border-b border-gray-200'
        )}
        style={{ gridTemplateColumns: `repeat(${columnCount}, 100px)` }}
      >
        {Array.from({ length: days.length + 1 }).map((_, index) => {
          if (index === 0) {
            return (
              <div
                key={index}
                className="flex cursor-pointer items-center justify-center gap-1 text-sm hover:bg-gray-200"
                onClick={onAddCourse}
              >
                <Plus size={16} />
                新增课程
              </div>
            )
          }
          const day = days[index - 1]
          if (!day) return null
          const label = `${day.month}月${day.day}日`

          return (
            <DropdownMenu
              key={index}
              onOpenChange={(e) => onOpenDay(e ? day : null)}
            >
              <DropdownMenuTrigger asChild>
                <div
                  className={cn(
                    'box-border flex cursor-pointer items-end pl-2 text-xs text-gray-400 transition-all hover:text-black',
                    'border-l'
                  )}
                >
                  <div className="flex flex-col leading-tight">
                    <span>{label}</span>
                    <span className="text-[10px]">
                      {'周' +
                        '日一二三四五六'[
                          new Date(day.year, day.month - 1, day.day).getDay()
                        ]}
                    </span>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{label}之后课程安排</DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={() => onShift('after', 'forward', 1)}
                  >
                    向后调整1天
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onShift('after', 'backward', 1)}
                  >
                    向前调整1天
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{label}之前课程安排</DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={() => onShift('before', 'forward', 1)}
                  >
                    向后调整1天
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onShift('before', 'backward', 1)}
                  >
                    向前调整1天
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}
      </div>
    )
  })
)

const SubjectSelector = memo(function SubjectSelector({
  renderSubject,
  scheduleEdit,
  onSelect,
}: SubjectSelectorProps) {
  return (
    <>
      <div
        className={cn(
          'sticky top-0 left-0 flex w-full items-center gap-2 overflow-hidden rounded-tl-md border-gray-300 bg-white px-2 text-gray-700 transition-all',
          scheduleEdit.visibleEdit ? 'h-10 border-b' : 'h-0 border-none'
        )}
      >
        <TableProperties size={20} />
        {`请选择（${scheduleEdit.schoolName}）${scheduleEdit.projectName} ${scheduleEdit.startDate} 至 ${scheduleEdit.endDate}安排科目`}
      </div>
      <FieldGroup className="flex flex-row flex-wrap gap-2 p-2 [--radius:9999rem]">
        {renderSubject.map((option) => (
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
                onCheckedChange={(checked) => onSelect(checked, option.id)}
                checked={scheduleEdit.subjectsId === option.id}
                className="-ml-6 -translate-x-1 rounded-full bg-white transition-all duration-100 ease-linear data-[state=checked]:ml-0 data-[state=checked]:translate-x-0"
              />
              <FieldTitle>{option.name}</FieldTitle>
            </Field>
          </FieldLabel>
        ))}
      </FieldGroup>
    </>
  )
})

const TeacherSelector = memo(function TeacherSelector({
  teacherData,
  scheduleEdit,
  onSelect,
  dateRange,
  scheduleData,
}: TeacherSelectorProps) {
  return (
    <>
      <div
        className={cn(
          'sticky top-0 left-0 z-30 flex w-full items-center gap-2 overflow-hidden rounded-tr-md border-gray-300 bg-white px-2 text-gray-700 transition-all',
          scheduleEdit.visibleEdit ? 'h-10 border-b' : 'h-0 border-none'
        )}
      >
        <User size={20} />
        {`请选择（${scheduleEdit.schoolName}）${scheduleEdit.projectName} ${scheduleEdit.startDate} 至 ${scheduleEdit.endDate}安排上课讲师`}
      </div>

      <div className="flex flex-wrap content-start items-start gap-2 p-2 pb-20">
        {teacherData.map((item) => (
          <TeacherOption
            key={item.id}
            item={item}
            selected={item.id === scheduleEdit.teacherId}
            onSelect={onSelect}
            scheduleEdit={scheduleEdit}
            dateRange={dateRange}
            scheduleData={scheduleData}
          />
        ))}
      </div>
    </>
  )
})

const TeacherOption = memo(function TeacherOption({
  item,
  selected,
  onSelect,
  scheduleEdit,
  dateRange,
  scheduleData,
}: TeacherOptionProps) {
  const timelineScrollRef = useRef<HTMLDivElement | null>(null)
  const teacherScheduleData = useMemo(
    () => teacherSchedule.find((schedule) => schedule.teacherId === item.id),
    [item.id]
  )

  const parsedSchedules = useMemo(() => {
    if (!teacherScheduleData) return []

    return teacherScheduleData.schedule
      .map(({ start, end }) => {
        const startDate = dayjs(start, 'YYYY.MM.DD').startOf('day')
        const endDate = dayjs(end, 'YYYY.MM.DD').startOf('day')

        if (!startDate.isValid() || !endDate.isValid()) return null
        if (endDate.diff(startDate, 'day') < 0) return null

        return {
          start: startDate,
          end: endDate,
          label: `${startDate.format('MM.DD')} - ${endDate.format('MM.DD')}`,
        }
      })
      .filter(
        (
          item
        ): item is {
          start: Dayjs
          end: Dayjs
          label: string
        } => Boolean(item)
      )
  }, [teacherScheduleData])

  const timelineDays = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return []
    return getDaysInRange(dateRange.start, dateRange.end).map((d) => {
      const dateObj = new Date(d.year, d.month - 1, d.day)
      return {
        ...d,
        dayOfWeekName: '日一二三四五六'[dateObj.getDay()],
      }
    })
  }, [dateRange.end, dateRange.start])

  const axisStartDate = useMemo(() => {
    if (!dateRange.start) return null
    return dayjs(dateRange.start).startOf('day')
  }, [dateRange.start])

  const axisEndDate = useMemo(() => {
    if (!dateRange.end) return null
    return dayjs(dateRange.end).startOf('day')
  }, [dateRange.end])

  const scheduleBlocks = useMemo(() => {
    if (!axisStartDate || !axisEndDate) return []

    return parsedSchedules
      .map((slot, index) => {
        if (
          slot.end.isBefore(axisStartDate) ||
          slot.start.isAfter(axisEndDate)
        ) {
          return null
        }

        const displayStart = slot.start.isBefore(axisStartDate)
          ? axisStartDate
          : slot.start
        const displayEnd = slot.end.isAfter(axisEndDate)
          ? axisEndDate
          : slot.end

        const offset = displayStart.diff(axisStartDate, 'day')
        const duration = displayEnd.diff(displayStart, 'day') + 1

        return {
          key: `${item.id}-${index}`,
          left: offset * COL_WIDTH,
          width: Math.max(duration, 1) * COL_WIDTH,
          label: slot.label,
          clippedLeft: slot.start.isBefore(axisStartDate),
          clippedRight: slot.end.isAfter(axisEndDate),
        }
      })
      .filter(
        (
          block
        ): block is {
          key: string
          left: number
          width: number
          label: string
          clippedLeft: boolean
          clippedRight: boolean
        } => Boolean(block)
      )
  }, [axisStartDate, axisEndDate, parsedSchedules, item.id])

  const editingRange = useMemo(() => {
    if (
      !scheduleEdit.visibleEdit ||
      scheduleEdit.startTimestamp === null ||
      scheduleEdit.endTimestamp === null
    ) {
      return null
    }
    const start = dayjs(scheduleEdit.startTimestamp).startOf('day')
    const end = dayjs(scheduleEdit.endTimestamp).startOf('day')
    if (!start.isValid() || !end.isValid()) return null
    if (end.diff(start, 'day') < 0) return null
    return { start, end }
  }, [scheduleEdit])

  const hasInternalBusy = useMemo(() => {
    if (!editingRange) return false
    const s = editingRange.start.valueOf()
    const e = editingRange.end.valueOf()

    return Object.values(scheduleData).some((list) =>
      list.some(
        (entry) =>
          entry.teacherId === item.id &&
          entry.scheduleId !== scheduleEdit.scheduleId &&
          !(e < entry.startDate || s > entry.endDate)
      )
    )
  }, [editingRange, item.id, scheduleData, scheduleEdit.scheduleId])

  const isBusyInEditingRange = useMemo(() => {
    if (!editingRange) return false
    const externalBusy = parsedSchedules.some(
      (slot) =>
        slot.start.diff(editingRange.end, 'day') <= 0 &&
        slot.end.diff(editingRange.start, 'day') >= 0
    )
    return externalBusy || hasInternalBusy
  }, [editingRange, parsedSchedules, hasInternalBusy])

  const scrollTimelineToActiveRange = useCallback(() => {
    const el = timelineScrollRef.current
    if (
      !el ||
      !editingRange ||
      !axisStartDate ||
      !axisEndDate ||
      !timelineDays.length
    )
      return

    if (
      editingRange.end.isBefore(axisStartDate) ||
      editingRange.start.isAfter(axisEndDate)
    )
      return

    const displayStart = editingRange.start.isBefore(axisStartDate)
      ? axisStartDate
      : editingRange.start
    const displayEnd = editingRange.end.isAfter(axisEndDate)
      ? axisEndDate
      : editingRange.end

    const startOffset = displayStart.diff(axisStartDate, 'day')
    const duration = displayEnd.diff(displayStart, 'day') + 1
    const blockWidth = Math.max(duration, 1) * COL_WIDTH
    const blockStart = startOffset * COL_WIDTH
    const target = blockStart - (el.clientWidth - blockWidth) / 2

    el.scrollLeft = Math.max(target, 0)
  }, [editingRange, axisStartDate, axisEndDate, timelineDays.length])

  return (
    <div
      className={cn(
        'flex h-fit w-fit gap-2 rounded-full border-3 border-transparent px-2 py-1 shadow-none',
        selected ? 'border-blue-500' : '',
        isBusyInEditingRange ? 'bg-gray-200 text-gray-500' : 'bg-white'
      )}
    >
      <HoverCard>
        <HoverCardTrigger asChild>
          <div
            onClick={() => onSelect(item.id)}
            className="flex cursor-pointer items-center gap-2"
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
        </HoverCardTrigger>
        <HoverCardContent className="w-auto">
          <div className="flex justify-between gap-4">
            <Avatar>
              <AvatarImage
                src={item.avatar || 'https://github.com/shadcn.png'}
                alt="@shadcn"
              />
              <AvatarFallback>{item.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">{item.name}</h4>
              <p className="text-sm">{item.location}</p>
              <p className="text-sm">{item.phone}</p>
              <div className="text-muted-foreground text-xs">
                {item.subject.join(', ')}
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
      <Popover>
        <PopoverTrigger asChild>
          <div className="rounded-full bg-blue-50 p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <ChartNoAxesGantt
                  className="cursor-pointer"
                  strokeWidth={3}
                  size={20}
                  color="oklch(55.1% 0.027 264.364)"
                />
              </TooltipTrigger>
              <TooltipContent side="right">查看讲师排期</TooltipContent>
            </Tooltip>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[700px]"
          onOpenAutoFocus={() =>
            requestAnimationFrame(scrollTimelineToActiveRange)
          }
        >
          <div className="h-18 w-full overflow-auto" ref={timelineScrollRef}>
            <div
              className="relative flex h-full flex-nowrap items-center"
              style={{
                minWidth: `${Math.max(timelineDays.length, 1) * COL_WIDTH}px`,
              }}
            >
              {timelineDays.map((item) => (
                <div
                  key={`${item.year}-${item.month}-${item.day}`}
                  className="relative mt-4 flex h-0.5 w-[100px] shrink-0 bg-black"
                >
                  <p className="absolute -top-8 text-xs whitespace-nowrap">{`${item.month}月${item.day}日·周${item.dayOfWeekName}`}</p>
                </div>
              ))}
              {scheduleBlocks.map((block) => (
                <div
                  key={block.key}
                  className={cn(
                    'absolute top-5 flex h-8 items-center border border-blue-200 bg-blue-50 px-2 text-[10px] text-blue-900 shadow',
                    block.clippedLeft ? 'rounded-l-none' : 'rounded-l-md',
                    block.clippedRight ? 'rounded-r-none' : 'rounded-r-md'
                  )}
                  style={{ left: block.left, width: block.width }}
                >
                  {block.label}
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
})

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
  const [scheduleEdit, setScheduleEdit] = useState<ScheduleEditState>({
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
    startTimestamp: null,
    endTimestamp: null,
  })
  const scheduleEditRef = useRef<ScheduleEditState>(scheduleEdit)
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
  const projectData = useSelector(
    (state: RootState) => state.projects.projects,
    shallowEqual
  )
  const teacherData = useSelector(
    (state: RootState) => state.teachers.teachers,
    shallowEqual
  )
  const projectDataRef = useRef(projectData)
  const scheduleDataRef = useRef(scheduleData)
  const midDateRef = useRef<dateObj | null>(null)

  const [createProjectData, setCreateProjectData] = useState<{
    name: string
    schoolId: string
    schoolName: string
    description: string
  }>({
    name: '',
    schoolId: '',
    schoolName: '',
    description: '',
  })
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [deleteProjectTarget, setDeleteProjectTarget] =
    useState<Project | null>(null)
  const [addProjectOpen, setAddProjectOpen] = useState(false)
  const prevScheduleDataRef = useRef(scheduleData)
  const isApplyingUndoRedoRef = useRef(false)
  const canUndoAvailable = useSelector(selectCanUndo)
  const canRedoAvailable = useSelector(selectCanRedo)
  const editLog = useSelector((state: RootState) => state.editLog.log)
  const editCursor = useSelector((state: RootState) => state.editLog.cursor)
  const prevCursorRef = useRef(0)
  const ignoreNextApplyCountRef = useRef(0)
  const [selectedSchool, setSelectedSchool] = useState<school[]>([])

  const [midDate, setMidDate] = useState<dateObj | null>(null)
  useEffect(() => {
    projectDataRef.current = projectData
  }, [projectData])
  useEffect(() => {
    scheduleDataRef.current = scheduleData
  }, [scheduleData])
  useEffect(() => {
    midDateRef.current = midDate
  }, [midDate])
  useEffect(() => {
    scheduleEditRef.current = scheduleEdit
  }, [scheduleEdit])
  const [renderSubject, setRenderSubject] = useState(subjects)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'subject'>(
    'subject'
  )
  const [subjectSearch, setSubjectSearch] = useState<{
    text: string
    searched: boolean
  }>({
    text: '',
    searched: false,
  })
  const [teacherSearch, setTeacherSearch] = useState<{
    text: string
    searched: boolean
  }>({
    text: '',
    searched: false,
  })

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
      let _school: school[] = []
      e.forEach((schoolId) => {
        const school = schools.find((s) => s.value === schoolId)
        _school = _school.concat(school || [])
      })
      setSelectedSchool(_school)
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
  const findTeacher = (id: string) => teachers.find((t) => t.id === id)
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
  const hasTeacherOverlap = useCallback(
    (
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
    },
    [scheduleData]
  )
  const hasTeacherExternalConflict = useCallback(
    (teacherId: string, start: Date, end: Date) => {
      const teacherExt = teacherSchedule.find(
        (item) => item.teacherId === teacherId
      )
      if (!teacherExt) return false

      const s = dayjs(start).startOf('day')
      const e = dayjs(end).startOf('day')
      if (!s.isValid() || !e.isValid()) return false

      return teacherExt.schedule.some(({ start, end }) => {
        const extStart = dayjs(start, 'YYYY.MM.DD').startOf('day')
        const extEnd = dayjs(end, 'YYYY.MM.DD').startOf('day')
        if (!extStart.isValid() || !extEnd.isValid()) return false
        return extStart.diff(e, 'day') <= 0 && extEnd.diff(s, 'day') >= 0
      })
    },
    []
  )
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

  const resetProjectForm = useCallback(() => {
    setCreateProjectData({
      name: '',
      schoolId: '',
      schoolName: '',
      description: '',
    })
    setEditingProjectId(null)
  }, [])

  const handleProjectDialogChange = (open: boolean) => {
    setAddProjectOpen(open)
    if (!open) resetProjectForm()
  }

  const handleDateRangeChange = useCallback((next: DateRangeValue) => {
    const start = next?.start ?? null
    const end = next?.end ?? null
    setDays(getDaysInRange(start, end))
    setDateRange({ start, end })
  }, [])

  const handleCreateProject = () => {
    const projectId = editingProjectId ?? randomString(16)
    const payload = { ...createProjectData, id: projectId }
    if (!payload.schoolId) {
      toast.error('请选择一个校区')
      return
    }
    setAddProjectOpen(false)
    if (editingProjectId) {
      dispatch(updateProject(payload))
    } else {
      dispatch(addProject(payload))
    }
    resetProjectForm()
  }

  const handleEditProject = (project: Project) => {
    setCreateProjectData({
      name: project.name,
      schoolId: project.schoolId,
      schoolName: project.schoolName,
      description: project.description,
    })
    setEditingProjectId(project.id)
    setAddProjectOpen(true)
  }

  const handleDeleteProject = (project: Project) => {
    dispatch(deleteProjectSchedules(project.id))
    dispatch(removeProject(project.id))
    toast.success('删除成功', { description: project.name })
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

    if (dragMeta.sourceProjectId !== projectId) {
      const entries = scheduleData[dragMeta?.sourceProjectId ?? ''] || []
      const old = entries.find((s) => s.scheduleId === dragMeta.scheduleId)
      if (!old) return
      const startDate = new Date(dateRange.start)
      startDate.setDate(startDate.getDate() + (colIndex - 1))
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + ((dragMeta.durationDays ?? 1) - 1))
      const teacher = findTeacher(old.teacherId)
      if (hasOverlap(projectId, startDate, endDate)) {
        toast.error('日期冲突', { description: '该项目在所选日期已有安排' })
      } else if (
        hasTeacherOverlap(
          old.teacherId,
          startDate,
          endDate,
          dragMeta.scheduleId
        )
      ) {
        toast.error('教师冲突', {
          description: '该教师在所选日期已有其他项目安排',
        })
      } else {
        dispatch(
          deleteSchedule({
            projectId: dragMeta.sourceProjectId ?? '',
            scheduleId: dragMeta.scheduleId ?? '',
          })
        )
        dispatch(
          addSchedule({
            description: '',
            startDate,
            endDate,
            teacherId: old.teacherId,
            projectId,
            subjectsId: old.subjectsId,
            area: teacher?.location ?? '',
          })
        )
      }
    } else {
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

  const handleScheduleSubjects = useCallback(
    (checked: CheckedState, id: string) => {
      const currEdit = scheduleEditRef.current
      if (!currEdit.visibleEdit) return
      const nextSubjectsId = checked ? id : ''
      const schedule = scheduleDataRef.current[currEdit.projectId]?.find(
        (item) => item.scheduleId === currEdit.scheduleId
      )
      if (!schedule) return
      if (schedule.subjectsId === nextSubjectsId) return

      setScheduleEdit((prev) => ({
        ...prev,
        subjectsId: nextSubjectsId,
      }))

      dispatch(
        updateSchedule({
          ...schedule,
          subjectsId: nextSubjectsId,
        })
      )
    },
    [dispatch]
  )

  const handleScheduleTeacher = useCallback(
    (id: string) => {
      const currEdit = scheduleEditRef.current
      if (!currEdit.visibleEdit) return
      const schedule = scheduleDataRef.current[currEdit.projectId]?.find(
        (item) => item.scheduleId === currEdit.scheduleId
      )
      if (!schedule) return
      if (schedule.teacherId === id) return
      const scheduleStart = new Date(schedule.startDate)
      const scheduleEnd = new Date(schedule.endDate)
      if (
        hasTeacherExternalConflict(id, scheduleStart, scheduleEnd) ||
        hasTeacherOverlap(id, scheduleStart, scheduleEnd, schedule.scheduleId)
      ) {
        toast.error('教师冲突', { description: '该讲师在所选日期已有其他安排' })
        return
      }

      setScheduleEdit((prev) => ({
        ...prev,
        teacherId: id,
      }))

      dispatch(
        updateSchedule({
          ...schedule,
          teacherId: id,
        })
      )
    },
    [dispatch, hasTeacherExternalConflict, hasTeacherOverlap]
  )

  const handleSubjectSearch = () => {
    if (subjectSearch.text && subjectSearch.searched) {
      setRenderSubject(subjects)
      setSubjectSearch({
        text: '',
        searched: false,
      })
    } else {
      if (!subjectSearch.text) return
      if (subjectSearch.text && !subjectSearch.searched) {
        setRenderSubject(
          subjects.filter((item) => item.name.includes(subjectSearch.text))
        )
        setSubjectSearch({
          text: subjectSearch.text,
          searched: true,
        })
      }
    }
  }

  const handleTeacherSearch = () => {
    if (teacherSearch.text && teacherSearch.searched) {
      setTeacherSearch({
        text: '',
        searched: false,
      })
    } else {
      if (!teacherSearch.text) return
      if (teacherSearch.text && !teacherSearch.searched) {
        setTeacherSearch({
          text: teacherSearch.text,
          searched: true,
        })
      }
    }
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

  useEffect(() => {
    const { subjectsId } = scheduleEdit
    let _teachers: Teacher[] = []
    if (subjectsId === '' || teacherFilter === 'all') {
      _teachers = teachers
    } else {
      const subject = subjects.find((s) => s.id === subjectsId)
      teachers.forEach((t: Teacher) => {
        if (subject && t.subject.includes(subject.name)) {
          _teachers.push(t)
        }
      })
    }
    if (teacherSearch.text && teacherSearch.searched) {
      _teachers = _teachers.filter((t) => t.name.includes(teacherSearch.text))
    }
    dispatch(loadTeachers(_teachers))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleEdit, dispatch, teacherSearch.searched, teacherFilter])

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

  const shiftSchedules = useCallback(
    (
      scope: 'before' | 'after',
      direction: 'forward' | 'backward',
      amount: number
    ) => {
      const mid = midDateRef.current
      const projectDataCurrent = projectDataRef.current
      const scheduleDataCurrent = scheduleDataRef.current
      if (!mid) {
        toast.error('未获取锚点日期')
        return
      }
      const anchor = new Date(mid.year, mid.month - 1, mid.day)
      const DAY_MS = 24 * 60 * 60 * 1000
      const delta = (direction === 'forward' ? amount : -amount) * DAY_MS
      const dayStart = new Date(
        anchor.getFullYear(),
        anchor.getMonth(),
        anchor.getDate()
      ).getTime()

      type MoveCandidate = {
        item: ScheduleItem
        newStart: number
        newEnd: number
        conflictProject?: boolean
        conflictTeacher?: boolean
      }
      //分离出候选项目
      const candidates: MoveCandidate[] = []
      const movedIds = new Set<string>()

      projectDataCurrent.forEach((proj) => {
        const list = scheduleDataCurrent[proj.id] || []
        list.forEach((it) => {
          const match =
            scope === 'after'
              ? it.startDate >= dayStart
              : it.startDate < dayStart
          if (match) {
            const newStart = it.startDate + delta
            const newEnd = it.endDate + delta
            candidates.push({ item: it, newStart, newEnd })
            movedIds.add(it.scheduleId)
          }
        })
      })

      if (candidates.length === 0) {
        toast('无可调整的安排', {
          description: '所选范围内没有可调整的课程',
        })
        return
      }

      const excludeIds = Array.from(movedIds)
      const feasible: MoveCandidate[] = []
      const conflicts: MoveCandidate[] = []

      //第一轮冲突检测，检查可移动候选安排和不需要移动的安排是否有时间和教师冲突
      for (const c of candidates) {
        const { item, newStart, newEnd } = c
        const others = (scheduleData[item.projectId] || []).filter(
          (e) => !movedIds.has(e.scheduleId)
        )
        const conflictProject = others.some(
          (e) => !(newEnd < e.startDate || newStart > e.endDate)
        )
        const conflictTeacher =
          !!item.teacherId &&
          hasTeacherOverlap(
            item.teacherId,
            new Date(newStart),
            new Date(newEnd),
            excludeIds
          )

        if (conflictProject || conflictTeacher) {
          conflicts.push({ ...c, conflictProject, conflictTeacher })
        } else {
          feasible.push(c)
        }
      }
      // {
      //   const byProject = new Map<string, MoveCandidate[]>()
      //   feasible.forEach((c) => {
      //     const key = c.item.projectId
      //     const arr = byProject.get(key) || []
      //     arr.push(c)
      //     byProject.set(key, arr)
      //   })
      //   const conflictIds = new Set<string>()
      //   byProject.forEach((list) => {
      //     list.sort((a, b) => a.newStart - b.newStart)
      //     for (let i = 1; i < list.length; i++) {
      //       const prev = list[i - 1]
      //       const cur = list[i]
      //       if (!(cur.newStart > prev.newEnd || cur.newEnd < prev.newStart)) {
      //         conflictIds.add(prev.item.scheduleId)
      //         conflictIds.add(cur.item.scheduleId)
      //       }
      //     }
      //   })
      //   const byTeacher = new Map<string, MoveCandidate[]>()
      //   feasible.forEach((c) => {
      //     const t = c.item.teacherId
      //     if (!t) return
      //     const arr = byTeacher.get(t) || []
      //     arr.push(c)
      //     byTeacher.set(t, arr)
      //   })
      //   byTeacher.forEach((list) => {
      //     list.sort((a, b) => a.newStart - b.newStart)
      //     for (let i = 1; i < list.length; i++) {
      //       const prev = list[i - 1]
      //       const cur = list[i]
      //       if (!(cur.newStart > prev.newEnd || cur.newEnd < prev.newStart)) {
      //         conflictIds.add(prev.item.scheduleId)
      //         conflictIds.add(cur.item.scheduleId)
      //       }
      //     }
      //   })
      //   if (conflictIds.size > 0) {
      //     const stillFeasible: MoveCandidate[] = []
      //     const newlyConflicted: MoveCandidate[] = []
      //     feasible.forEach((c) => {
      //       if (conflictIds.has(c.item.scheduleId)) {
      //         newlyConflicted.push({ ...c, conflictProject: true })
      //       } else {
      //         stillFeasible.push(c)
      //       }
      //     })
      //     feasible.length = 0
      //     feasible.push(...stillFeasible)
      //     conflicts.push(...newlyConflicted)
      //   }
      //   const conflictsByProject = new Map<
      //     string,
      //     { start: number; end: number }[]
      //   >()
      //   conflicts.forEach((c) => {
      //     const key = c.item.projectId
      //     const arr = conflictsByProject.get(key) || []
      //     arr.push({ start: c.item.startDate, end: c.item.endDate })
      //     conflictsByProject.set(key, arr)
      //   })
      //   const conflictsByTeacher = new Map<
      //     string,
      //     { start: number; end: number }[]
      //   >()
      //   conflicts.forEach((c) => {
      //     const t = c.item.teacherId
      //     if (!t) return
      //     const arr = conflictsByTeacher.get(t) || []
      //     arr.push({ start: c.item.startDate, end: c.item.endDate })
      //     conflictsByTeacher.set(t, arr)
      //   })

      //   const conflictIds2 = new Set<string>()
      //   feasible.forEach((c) => {
      //     const projRanges = conflictsByProject.get(c.item.projectId) || []
      //     if (
      //       projRanges.some((e) => !(c.newEnd < e.start || c.newStart > e.end))
      //     ) {
      //       conflictIds2.add(c.item.scheduleId)
      //       return
      //     }
      //     const t = c.item.teacherId
      //     if (t) {
      //       const teacherRanges = conflictsByTeacher.get(t) || []
      //       if (
      //         teacherRanges.some(
      //           (e) => !(c.newEnd < e.start || c.newStart > e.end)
      //         )
      //       ) {
      //         conflictIds2.add(c.item.scheduleId)
      //       }
      //     }
      //   })
      //   if (conflictIds2.size > 0) {
      //     const stillFeasible: MoveCandidate[] = []
      //     const newlyConflicted: MoveCandidate[] = []
      //     feasible.forEach((c) => {
      //       if (conflictIds2.has(c.item.scheduleId)) {
      //         newlyConflicted.push({ ...c, conflictProject: true })
      //       } else {
      //         stillFeasible.push(c)
      //       }
      //     })
      //     feasible.length = 0
      //     feasible.push(...stillFeasible)
      //     conflicts.push(...newlyConflicted)
      //   }
      // }

      if (conflicts.length > 0) {
        toast.error('存在冲突安排', {
          description: `请检查冲突安排`,
        })
        return
      }

      feasible.forEach(({ item, newStart, newEnd }) => {
        dispatch(
          updateSchedule({
            projectId: item.projectId,
            startDate: new Date(newStart),
            endDate: new Date(newEnd),
            description: item.description,
            teacherId: item.teacherId,
            area: item.area,
            subjectsId: item.subjectsId,
            scheduleId: item.scheduleId,
          })
        )
      })

      toast.success('批量调整完成', {
        description: `已调整 ${feasible.length} 条安排`,
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch]
  )

  const handleAddCourse = useCallback(() => {
    if (selectedSchool.length <= 0) {
      toast.error('请先选择校区')
      return
    }
    resetProjectForm()
    setAddProjectOpen(true)
  }, [selectedSchool.length, resetProjectForm])

  const handleOpenDay = useCallback(
    (day: dateObj | null) => {
      setMidDate(day)
    },
    [setMidDate]
  )

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
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          {/*<Button variant="outline" className="cursor-pointer">
            <RotateCw />
            初始化编辑器
          </Button>*/}

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
                'relative grid h-1/3 w-full grid-cols-2 overflow-hidden border-b border-gray-300 bg-gray-100'
              )}
            >
              <div className="relative overflow-auto border-r border-gray-300">
                <SubjectSelector
                  renderSubject={renderSubject}
                  scheduleEdit={scheduleEdit}
                  onSelect={handleScheduleSubjects}
                />
              </div>
              <div className="relative overflow-auto">
                <TeacherSelector
                  teacherData={teacherData}
                  scheduleEdit={scheduleEdit}
                  onSelect={handleScheduleTeacher}
                  dateRange={dateRange}
                  scheduleData={scheduleData}
                />
              </div>
              <div className="absolute right-1/2 bottom-4 w-60 -translate-x-4 rounded-md bg-white shadow-md">
                <InputGroup>
                  <InputGroupInput
                    value={subjectSearch.text}
                    placeholder="输入要搜索的科目"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSubjectSearch()
                      }
                    }}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSubjectSearch({
                        text: e.target.value,
                        searched: false,
                      })
                    }
                  />
                  <InputGroupAddon
                    align="inline-end"
                    className="cursor-pointer"
                    onClick={handleSubjectSearch}
                  >
                    <InputGroupButton
                      className="cursor-pointer"
                      variant="secondary"
                    >
                      {subjectSearch.text && subjectSearch.searched
                        ? '清空'
                        : '搜索'}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              <div className="absolute right-0 bottom-4 flex -translate-x-4 items-center gap-2 rounded-md bg-white shadow-md">
                <div className="flex items-center justify-center space-x-2 pl-2">
                  <Label className="mr-0 w-12" htmlFor="airplane-mode">
                    按科目
                  </Label>
                  <Switch
                    id="airplane-mode"
                    checked={teacherFilter === 'all'}
                    onCheckedChange={(checked) =>
                      setTeacherFilter(checked ? 'all' : 'subject')
                    }
                  />
                  <Label className="mr-0 w-14" htmlFor="airplane-mode">
                    全部讲师
                  </Label>
                </div>
                <div className="h-6 w-0 border-l"></div>
                <InputGroup className="w-60">
                  <InputGroupInput
                    value={teacherSearch.text}
                    placeholder="输入要搜索的讲师"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleTeacherSearch()
                      }
                    }}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTeacherSearch({
                        text: e.target.value,
                        searched: false,
                      })
                    }
                  />
                  <InputGroupAddon
                    align="inline-end"
                    onClick={handleTeacherSearch}
                  >
                    <InputGroupButton variant="secondary">
                      {teacherSearch.text && teacherSearch.searched
                        ? '清空'
                        : '搜索'}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
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
                <TimeBar
                  ref={timeBarRef}
                  days={days}
                  dateRange={dateRange}
                  onAddCourse={handleAddCourse}
                  onOpenDay={handleOpenDay}
                  onShift={shiftSchedules}
                />
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
                          startTimestamp: null,
                          endTimestamp: null,
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'flex h-13 w-22 cursor-pointer flex-col rounded-md border-2 border-gray-50/50 bg-white p-1 text-xs shadow-md transition-all hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none'
                              )}
                            >
                              <div className="mb-1 w-18 flex-nowrap truncate text-xs text-gray-500">
                                <ScrollText speed={120}>
                                  {item.schoolName}
                                </ScrollText>
                              </div>
                              <div className="flex truncate select-none">
                                <ScrollText speed={120}>{item.name}</ScrollText>
                              </div>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" side="bottom">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault()
                                handleEditProject(item)
                              }}
                              className="gap-2"
                            >
                              <SquarePen className="h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault()
                                setDeleteProjectTarget(item)
                              }}
                              className="gap-2 text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {days.map((day, index) => (
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
                      ))}
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
                                    startTimestamp: null,
                                    endTimestamp: null,
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
                                    startTimestamp: null,
                                    endTimestamp: null,
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
                                          startTimestamp: schedule.startDate,
                                          endTimestamp: schedule.endDate,
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
      <Dialog open={addProjectOpen} onOpenChange={handleProjectDialogChange}>
        <form>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingProjectId ? '编辑班期' : '创建班期'}
              </DialogTitle>
              <DialogDescription>
                {editingProjectId ? '更新课程班期信息' : '新增一个课程班期'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="name-1">校区</Label>
                <Select
                  value={createProjectData.schoolId}
                  onValueChange={(e) => {
                    const school = schools.find((item) => item.value === e)
                    if (school) {
                      setCreateProjectData({
                        ...createProjectData,
                        schoolId: school ? school.value : '',
                        schoolName: school ? school.label : '',
                      })
                    }
                    console.log(e)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择一个校区" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>校区列表</SelectLabel>
                      {selectedSchool.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="className">班期名称</Label>
                <Input
                  value={createProjectData.name}
                  onInput={(e) =>
                    setCreateProjectData({
                      ...createProjectData,
                      name: e.currentTarget.value,
                    })
                  }
                  id="className"
                  placeholder="请输入班期名称"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button onClick={handleCreateProject} type="submit">
                {editingProjectId ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
      <AlertDialog
        open={!!deleteProjectTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteProjectTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除班期？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteProjectTarget
                ? `将删除班期「${deleteProjectTarget.name}」，其课程排期也将移除。此操作不可撤销。`
                : '此操作不可撤销。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteProjectTarget) {
                  handleDeleteProject(deleteProjectTarget)
                  setDeleteProjectTarget(null)
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default App
