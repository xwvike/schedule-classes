import { cn } from '@/lib/utils'
import { Share, CircleQuestionMark } from 'lucide-react'
import { Button } from '@/components/ui/button'

function Header() {
  return (
    <div className={cn('box-border h-16 w-full border-b border-gray-300')}>
      <div
        className={cn(
          'box-border flex h-full w-full items-center justify-between px-4'
        )}
      >
        <div className={cn('flex w-1/3 items-center')}></div>
        <div className="flex w-1/3 items-center justify-center gap-2"></div>

        <div className="flex w-1/3 justify-end gap-2">
          <Button className="cursor-pointer">
            <Share />
            导出
          </Button>
          <Button variant="ghost" size="icon" className="cursor-pointer">
            <CircleQuestionMark />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Header
