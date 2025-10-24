import { cn } from '@/lib/utils'
import Header from './components/header'
import DateRangePicker from './components/date-range-picker'
import SchoolSelect from './components/school-select'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface DateRange {
  start: Date | null
  end: Date | null
}

function countDaysInclusive(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0
  const startUTC = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  )
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  if (endUTC < startUTC) return 0
  const diffDays = Math.floor((endUTC - startUTC) / 86400000) + 1
  return diffDays
}

function getDaysInRange(
  start: Date | null,
  end: Date | null
): Array<{ year: number; month: number; day: number }> {
  if (!start || !end) return []
  const startUTC = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  )
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  if (endUTC < startUTC) return []

  const days: Array<{ year: number; month: number; day: number }> = []
  const current = new Date(start)

  while (current <= end) {
    days.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      day: current.getDate(),
    })
    current.setDate(current.getDate() + 1)
  }

  return days
}

function App() {
  const contentRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
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
  const [projects, setProjects] = useState([
    {
      id: '1',
      name: '语文',
      description: '这是一个项目',
    },
    {
      id: '2',
      name: '数学',
      description: '这是一个项目',
    },
    {
      id: '3',
      name: '英语',
      description: '这是一个项目',
    },
  ])
  const [teacher, setTeacher] = useState([
    {
      avatar: '',
      name: '张三',
      location: '河南',
      phone: '19999999999',
      id: '1',
      subject: '数学',
    },
  ])

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
    const paddingTotal = remPx * 1 // outer container vertical padding: p-2 top+bottom = 1rem
    const available = Math.max(
      0,
      Math.floor(svh - headerH - toolbarH - paddingTotal)
    )
    setContentHeight(available)
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
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('orientationchange', handle)
      clearTimeout(id)
      ro.disconnect()
    }
  }, [])

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
              {teacher.map((item) => (
                <div
                  draggable="true"
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
              <div className={cn('w-16 shrink-0 border-r')}></div>
              <div
                className={cn('overflow-auto')}
                style={{ width: 'calc(100%-4rem)' }}
              >
                <div
                  className={cn('grid h-8')}
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
                      {index > 0 &&
                        days.length > 0 &&
                        days[index - 1]?.month +
                          '月' +
                          days[index - 1]?.day +
                          '日'}
                    </div>
                  ))}
                </div>
                <div style={{ height: 'calc(100% - 2rem)' }}>
                  {projects.map((_, index) => (
                    <div
                      className="relative grid h-13"
                      style={{
                        width: `${(days.length + 1) * 100}px`,
                        gridTemplateColumns: `repeat(${days.length + 1}, 100px)`,
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrag={(e) => {
                        e.preventDefault()
                      }}
                    >
                      {index === 1 ? (
                        <div
                          draggable="true"
                          className="absolute top-0 h-13 w-[200px] rounded-md bg-blue-200 drop-shadow"
                          style={{ left: '300px' }}
                        ></div>
                      ) : null}
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
