import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'

export type school = {
  value: string
  label: string
}
type schoolSelectProps = {
  allSchools: school[]
  defaultValue: string[]
  onChange: (selectedSchools: string[]) => void
}
function SchoolSelect(props: schoolSelectProps) {
  const { allSchools, defaultValue, onChange } = props
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<string[]>(defaultValue)

  const selectEvent = (id: string) => {
    const nextValues = hasSelect(id)
      ? values.filter((v) => v !== id)
      : [...values, id]

    setValues(nextValues)
    onChange(nextValues)
  }

  const hasSelect = (id: string) => {
    return values.includes(id)
  }

  const label = () => {
    if (values.length <= 0) return '请选择校区'
    if (values.length >= 1)
      return (
        allSchools.find((item) => item.value === values[0])?.label || '未知校区'
      )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            {label()}
            {values.length > 1 && (
              <Badge
                className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                variant="outline"
              >
                +{values.length - 1}
              </Badge>
            )}
          </div>

          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="搜索校区..." className="h-9" />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {allSchools.map((framework) => (
                <CommandItem
                  key={framework.value}
                  value={framework.value}
                  onSelect={(currentValue) => {
                    selectEvent(currentValue)
                  }}
                >
                  {framework.label}
                  <Check
                    className={cn(
                      'ml-auto',
                      hasSelect(framework.value) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default SchoolSelect
