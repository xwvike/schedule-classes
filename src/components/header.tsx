import { cn } from '@/lib/utils'
import { Undo2, Redo2, Share, CircleQuestionMark } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useDispatch, useSelector } from 'react-redux'
import {
  undo,
  redo,
  selectCanUndo,
  selectCanRedo,
} from '@/store/editLogReducer'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function Header() {
  const dispatch = useDispatch()
  const canUndoAvailable = useSelector(selectCanUndo)
  const canRedoAvailable = useSelector(selectCanRedo)
  return (
    <div className={cn('box-border h-16 w-full border-b border-gray-300')}>
      <div
        className={cn(
          'box-border flex h-full w-full items-center justify-between px-4'
        )}
      >
        <div className={cn('flex w-1/3 items-center')}></div>
        <div className="flex w-1/3 items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={() => {
                  if (canUndoAvailable) dispatch(undo())
                }}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md bg-white',
                  canUndoAvailable
                    ? 'cursor-pointer hover:bg-blue-50'
                    : 'cursor-not-allowed opacity-50'
                )}
              >
                <Undo2 size={22} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>撤销</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={() => {
                  if (canRedoAvailable) dispatch(redo())
                }}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md bg-white',
                  canRedoAvailable
                    ? 'cursor-pointer hover:bg-blue-50'
                    : 'cursor-not-allowed opacity-50'
                )}
              >
                <Redo2 size={22} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>重做</p>
            </TooltipContent>
          </Tooltip>
        </div>

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
