import { memo, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export type DateRangeValue = { start?: Date | null; end?: Date | null }

type DateRangePickerProps = {
  value?: DateRangeValue
  defaultValue?: DateRangeValue
  onChange?: (next: DateRangeValue) => void
  onStartChange?: (date?: Date) => void
  onEndChange?: (date?: Date) => void
  startPlaceholder?: string
  endPlaceholder?: string
  formatDate?: (date: Date) => string
  enforceOrder?: boolean
}

function DateRangePicker(props: DateRangePickerProps) {
  const {
    value,
    defaultValue,
    onChange,
    onStartChange,
    onEndChange,
    startPlaceholder = '选择开始日期',
    endPlaceholder = '选择结束日期',
    formatDate: formatDateProp,
    enforceOrder = true,
  } = props

  const [openStart, setOpenStart] = useState(false)
  const [openEnd, setOpenEnd] = useState(false)
  const [dateStart, setDateStart] = useState<Date | undefined>(
    defaultValue?.start || undefined
  )
  const [dateEnd, setDateEnd] = useState<Date | undefined>(
    defaultValue?.end || undefined
  )

  const start = value ? value.start : dateStart
  const end = value ? value.end : dateEnd

  const formatDate = (d?: Date) =>
    d ? (formatDateProp ? formatDateProp(d) : d.toLocaleDateString()) : ''

  const normalizeRange = (s?: Date, e?: Date): DateRangeValue => {
    if (!enforceOrder || !s || !e) return { start: s, end: e }
    return s <= e ? { start: s, end: e } : { start: e, end: s }
  }

  const applyNext = (next: DateRangeValue) => {
    if (!value) {
      setDateStart(next.start || undefined)
      setDateEnd(next.end || undefined)
    }
    onChange?.(next)
  }

  const handleStartSelect = (date?: Date) => {
    onStartChange?.(date)
    const next = normalizeRange(date, end || undefined)
    applyNext(next)
    setOpenStart(false)
  }

  const handleEndSelect = (date?: Date) => {
    onEndChange?.(date)
    const next = normalizeRange(start || undefined, date)
    applyNext(next)
    setOpenEnd(false)
  }

  return (
    <div className="flex flex-nowrap items-center">
      <Popover open={openStart} onOpenChange={setOpenStart}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-32 justify-between font-normal"
          >
            {start ? formatDate(start) : startPlaceholder}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={start || undefined}
            defaultMonth={start || undefined}
            captionLayout="dropdown"
            disabled={enforceOrder && end ? { after: end } : undefined}
            onSelect={handleStartSelect}
          />
        </PopoverContent>
      </Popover>
      <div className="mx-2">至</div>
      <Popover open={openEnd} onOpenChange={setOpenEnd}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-32 justify-between font-normal"
          >
            {end ? formatDate(end) : endPlaceholder}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={end || undefined}
            defaultMonth={end || undefined}
            captionLayout="dropdown"
            disabled={enforceOrder && start ? { before: start } : undefined}
            onSelect={handleEndSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default memo(DateRangePicker)
