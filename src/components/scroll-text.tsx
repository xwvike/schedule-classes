import { cn, randomString } from '@/lib/utils'
import {
  type PropsWithChildren,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type ScrollTextProps = PropsWithChildren<{
  className?: string
  gap?: number
  speed?: number // pixels per second
}>

const DEFAULT_GAP = 24
const DEFAULT_SPEED = 80

function ScrollText({
  children,
  className,
  gap = DEFAULT_GAP,
  speed = DEFAULT_SPEED,
}: ScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const animationName = useMemo(() => `scroll-text-${randomString(8)}`, [])

  useLayoutEffect(() => {
    const measure = () => {
      if (!containerRef.current || !contentRef.current) return
      setContainerWidth(containerRef.current.clientWidth)
      setContentWidth(contentRef.current.scrollWidth)
    }

    const resizeObserver = new ResizeObserver(measure)

    if (containerRef.current) resizeObserver.observe(containerRef.current)
    if (contentRef.current) resizeObserver.observe(contentRef.current)

    measure()

    return () => resizeObserver.disconnect()
  }, [children])

  const needsScroll = contentWidth > containerWidth + 1
  const travelDistance = contentWidth + gap
  const effectiveSpeed = Math.max(20, speed)
  const durationSeconds = Math.max(6, travelDistance / effectiveSpeed)

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
    >
      {needsScroll ? (
        <div
          className="flex items-center whitespace-nowrap"
          style={{
            gap: `${gap}px`,
            animation: `${animationName} ${durationSeconds}s linear infinite`,
          }}
        >
          <span ref={contentRef} className="inline-block">
            {children}
          </span>
          <span aria-hidden className="inline-block">
            {children}
          </span>
        </div>
      ) : (
        <span ref={contentRef} className="block truncate">
          {children}
        </span>
      )}
      {needsScroll ? (
        <style>
          {`@keyframes ${animationName} {
            0% { transform: translateX(0); }
            100% { transform: translateX(-${travelDistance}px); }
          }`}
        </style>
      ) : null}
    </div>
  )
}

export default ScrollText
