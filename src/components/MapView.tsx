import { useRef, useEffect, useCallback, useState } from 'react'
import { zoom } from 'd3-zoom'
import { select } from 'd3-selection'
import { quadtree } from 'd3-quadtree'
import { polygonContains } from 'd3-polygon'
import { computeHulls, hullToPath } from '../hooks/useHulls'
import { buildColorScale } from '../utils/colors'
import { DOT_RADIUS, DOT_RADIUS_HOVER, DOT_RADIUS_MATCH, DOT_RADIUS_NON_MATCH, LABEL_ZOOM_THRESHOLD, LABEL_FONT_SIZE, LABEL_MIN_WIDTH, LABEL_PILL_PADDING_H, LABEL_CHAR_WIDTH_RATIO, LABEL_OFFSET_ABOVE, LABEL_MAX_HEIGHT, LABEL_PILL_OPACITY, LABEL_PILL_BG_COLOR, LABEL_PILL_BORDER_COLOR, HULL_OPACITY, HULL_OPACITY_DIMMED } from '../config'
import type { Startup } from '../types'
import type { ZoomTransform } from 'd3-zoom'
import type { MatchInfo } from '../utils/search'

interface MapViewProps {
  startups: Startup[]
  width: number
  height: number
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
  transform: ZoomTransform
  onTransformChange: (t: ZoomTransform) => void
  onStartupClick: (s: Startup) => void
  onCategoryClick: (categoryId: string, categoryName: string) => void
  hoveredId: string | null
  selectedId: string | null
  onHoverChange: (id: string | null) => void
  searchActive?: boolean
  matchIds?: Set<string>
  matchInfo?: Map<string, MatchInfo>
  categoryMatchCounts?: Map<string, number>
}

export function MapView({
  startups,
  width,
  height,
  bounds,
  transform,
  onTransformChange,
  onStartupClick,
  onCategoryClick,
  hoveredId,
  selectedId,
  onHoverChange,
  searchActive = false,
  matchIds = new Set(),
  matchInfo = new Map(),
  categoryMatchCounts = new Map(),
}: MapViewProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const hulls = computeHulls(startups)
  const colorScale = buildColorScale([...new Set(startups.map((s) => s.category_id))])

  const zoomBehavior = useRef(
    zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.5, 20])
      .on('zoom', (e) => onTransformChange(e.transform))
  ).current

  useEffect(() => {
    if (!containerRef.current) return
    const sel = select(containerRef.current)
    sel.call(zoomBehavior)
    sel.call(zoomBehavior.transform, transform)
  }, [zoomBehavior, transform])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !width || !height) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const t = transform
    const pad = 100

    const draw = () => {
      ctx.save()
      ctx.setTransform(t.k, 0, 0, t.k, t.x, t.y)
      ctx.clearRect(
        bounds.minX - pad,
        bounds.minY - pad,
        bounds.maxX - bounds.minX + pad * 2,
        bounds.maxY - bounds.minY + pad * 2
      )

      for (const s of startups) {
        const isMatch = searchActive && matchIds.has(s.id)
        const isUncategorized = s.category_name === 'Uncategorized'

        let color: string
        let alpha: number
        let r: number
        let strokeStyle: string
        let lineWidth: number

        if (searchActive) {
          if (isMatch) {
            color = isUncategorized ? '#888' : (colorScale.get(s.category_id) ?? '#999')
            alpha = 0.95
            r = s.id === hoveredId ? DOT_RADIUS_HOVER : DOT_RADIUS_MATCH
            strokeStyle = 'rgba(255,255,255,1)'
            lineWidth = 1.5
          } else {
            color = '#999'
            alpha = 0.15
            r = DOT_RADIUS_NON_MATCH
            strokeStyle = 'rgba(255,255,255,0.3)'
            lineWidth = 0.5
          }
        } else {
          color = isUncategorized ? '#888' : (colorScale.get(s.category_id) ?? '#999')
          alpha = 0.85
          r = s.id === hoveredId ? DOT_RADIUS_HOVER : DOT_RADIUS
          strokeStyle = 'rgba(255,255,255,0.8)'
          lineWidth = 1
        }

        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.strokeStyle = strokeStyle
        ctx.lineWidth = lineWidth
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        if (s.id === selectedId) {
          ctx.strokeStyle = '#333'
          ctx.lineWidth = 2
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      ctx.restore()
    }

    draw()
  }, [startups, transform, bounds, colorScale, hoveredId, selectedId, width, height, searchActive, matchIds])

  const findNearestStartup = useCallback(
    (dataX: number, dataY: number): Startup | null => {
      if (startups.length === 0) return null
      const tree = quadtree<Startup>()
        .x((d) => d.x)
        .y((d) => d.y)
        .addAll(startups)
      const hit = tree.find(dataX, dataY)
      if (!hit) return null
      const dist = Math.hypot(dataX - hit.x, dataY - hit.y)
      const threshold = (hoveredId === hit.id ? DOT_RADIUS_HOVER : DOT_RADIUS) * 2.5
      return dist < threshold ? hit : null
    },
    [startups, hoveredId]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const [dataX, dataY] = transform.invert([
        e.clientX - rect.left,
        e.clientY - rect.top,
      ])
      const found = findNearestStartup(dataX, dataY)
      onHoverChange(found?.id ?? null)
      if (searchActive && found && matchInfo.has(found.id)) {
        const info = matchInfo.get(found.id)!
        const matchedOnStr = info.matchedOn.join(', ')
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          text: `Match strength: ${info.strength.charAt(0).toUpperCase() + info.strength.slice(1)}\nMatched on: ${matchedOnStr}`,
        })
      } else {
        setTooltip(null)
      }
    },
    [transform, findNearestStartup, onHoverChange, searchActive, matchInfo]
  )

  const handlePointerLeave = useCallback(() => {
    onHoverChange(null)
    setTooltip(null)
  }, [onHoverChange])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const [dataX, dataY] = transform.invert([
        e.clientX - rect.left,
        e.clientY - rect.top,
      ])
      const hit = findNearestStartup(dataX, dataY)
      if (hit) {
        onStartupClick(hit)
        return
      }
      for (const hull of hulls) {
        if (polygonContains(hull.points, [dataX, dataY])) {
          const first = startups.find((s) => s.category_id === hull.categoryId)
          onCategoryClick(hull.categoryId, first?.category_name ?? hull.categoryId)
          return
        }
      }
    },
    [startups, hulls, transform, findNearestStartup, onStartupClick, onCategoryClick]
  )

  const showLabels = transform.k >= LABEL_ZOOM_THRESHOLD

  return (
    <div
      ref={containerRef}
      className="map-container"
      style={{ width, height }}
    >
      {tooltip && searchActive && (
        <div
          className="map-tooltip"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
          }}
        >
          {tooltip.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
      <svg
        className="map-svg map-svg-hulls"
        width={width}
        height={height}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {hulls.map((h) => {
            const catColor = colorScale.get(h.categoryId)
            const matchCount = searchActive ? (categoryMatchCounts.get(h.categoryId) ?? 0) : null
            const hasMatches = matchCount === null || matchCount > 0
            const fillOpacity = searchActive && !hasMatches ? HULL_OPACITY_DIMMED : HULL_OPACITY
            const fillColor = catColor
              ? `rgba(${parseInt(catColor.slice(1, 3), 16)},${parseInt(catColor.slice(3, 5), 16)},${parseInt(catColor.slice(5, 7), 16)},${fillOpacity})`
              : `rgba(0,0,0,${fillOpacity})`
            return (
            <path
              key={h.categoryId}
              d={hullToPath(h)}
              fill={fillColor}
              className={`hull-path ${searchActive && !hasMatches ? 'hull-dimmed' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                const first = startups.find((s) => s.category_id === h.categoryId)
                onCategoryClick(h.categoryId, first?.category_name ?? h.categoryId)
              }}
            />
          )})}
        </g>
      </svg>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`map-canvas ${hoveredId ? 'pointer' : ''}`}
        style={{ position: 'absolute', left: 0, top: 0 }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />
      <svg
        className="map-svg map-svg-labels"
        width={width}
        height={height}
        style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {showLabels &&
            hulls.map((h) => {
              const first = startups.find((s) => s.category_id === h.categoryId)
              const name = first?.category_name ?? h.categoryId
              const matchCount = searchActive ? (categoryMatchCounts.get(h.categoryId) ?? 0) : null
              const hasMatches = matchCount === null || matchCount > 0
              const labelText = searchActive && matchCount !== null
                ? `${name} (${matchCount})`
                : name
              const labelWidth = Math.max(
                LABEL_MIN_WIDTH,
                labelText.length * LABEL_FONT_SIZE * LABEL_CHAR_WIDTH_RATIO + 2 * LABEL_PILL_PADDING_H
              )
              const halfW = labelWidth / 2
              const labelY = h.centroid[1] - LABEL_OFFSET_ABOVE - LABEL_MAX_HEIGHT / 2
              return (
                <g
                  key={`label-${h.categoryId}`}
                  transform={`translate(${h.centroid[0]},${labelY})`}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCategoryClick(h.categoryId, name)
                  }}
                >
                  <rect
                    x={-halfW}
                    y={-LABEL_MAX_HEIGHT / 2}
                    width={labelWidth}
                    height={LABEL_MAX_HEIGHT}
                    rx={8}
                    fill={LABEL_PILL_BG_COLOR}
                    fillOpacity={LABEL_PILL_OPACITY}
                    stroke={LABEL_PILL_BORDER_COLOR}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={LABEL_FONT_SIZE}
                    fontWeight={searchActive && hasMatches ? 'bold' : 'normal'}
                    x={0}
                    y={0}
                  >
                    {labelText}
                  </text>
                </g>
              )
            })}
        </g>
      </svg>
    </div>
  )
}
