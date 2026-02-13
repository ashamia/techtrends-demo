import { useRef, useCallback, useState } from 'react'

interface DualRangeSliderProps {
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
}

export function DualRangeSlider({ min, max, value, onChange }: DualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)

  const range = max - min
  const leftPct = ((value[0] - min) / range) * 100
  const rightPct = ((value[1] - min) / range) * 100

  const pctToValue = useCallback(
    (pct: number) => Math.round(min + (pct / 100) * range),
    [min, range]
  )

  const handleMinDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDragging('min')
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handleMaxDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDragging('max')
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      const v = pctToValue(pct)
      if (dragging === 'min') {
        onChange([Math.min(v, value[1] - 1), value[1]])
      } else {
        onChange([value[0], Math.max(v, value[0] + 1)])
      }
    },
    [dragging, value, onChange, pctToValue]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      setDragging(null)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    },
    []
  )

  return (
    <div
      className="range-slider"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div ref={trackRef} className="range-track" />
      <div
        className="range-fill"
        style={{
          left: `${leftPct}%`,
          width: `${rightPct - leftPct}%`,
        }}
      />
      <div
        className="range-thumb"
        style={{ left: `${leftPct}%` }}
        onPointerDown={handleMinDown}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value[0]}
      />
      <div
        className="range-thumb"
        style={{ left: `${rightPct}%` }}
        onPointerDown={handleMaxDown}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value[1]}
      />
    </div>
  )
}
