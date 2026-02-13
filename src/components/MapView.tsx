import { useRef, useEffect, useCallback } from 'react'
import { zoom } from 'd3-zoom'
import { select } from 'd3-selection'
import { quadtree } from 'd3-quadtree'
import { polygonContains } from 'd3-polygon'
import { computeHulls, hullToPath } from '../hooks/useHulls'
import { buildColorScale } from '../utils/colors'
import { DOT_RADIUS, DOT_RADIUS_HOVER, LABEL_ZOOM_THRESHOLD } from '../config'
import type { Startup } from '../types'
import type { ZoomTransform } from 'd3-zoom'

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
}: MapViewProps) {
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
        const isUncategorized = s.category_name === 'Uncategorized'
        const color = isUncategorized ? '#888' : (colorScale.get(s.category_id) ?? '#999')
        ctx.fillStyle = color
        ctx.strokeStyle = isUncategorized ? '#ccc' : '#333'
        ctx.lineWidth = s.id === selectedId ? 2 : (isUncategorized ? 1 : 0)
        const r = s.id === hoveredId ? DOT_RADIUS_HOVER : DOT_RADIUS
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fill()
        if (s.id === selectedId || s.id === hoveredId || isUncategorized) {
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    draw()
  }, [startups, transform, bounds, colorScale, hoveredId, selectedId, width, height])

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
    },
    [transform, findNearestStartup, onHoverChange]
  )

  const handlePointerLeave = useCallback(() => {
    onHoverChange(null)
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
      <svg
        className="map-svg map-svg-hulls"
        width={width}
        height={height}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {hulls.map((h) => (
            <path
              key={h.categoryId}
              d={hullToPath(h)}
              fill="rgba(0,0,0,0.05)"
              className="hull-path"
              onClick={(e) => {
                e.stopPropagation()
                const first = startups.find((s) => s.category_id === h.categoryId)
                onCategoryClick(h.categoryId, first?.category_name ?? h.categoryId)
              }}
            />
          ))}
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
              return (
                <g
                  key={`label-${h.categoryId}`}
                  transform={`translate(${h.centroid[0]},${h.centroid[1]})`}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCategoryClick(h.categoryId, name)
                  }}
                >
                  <rect
                    x={-60}
                    y={-10}
                    width={120}
                    height={20}
                    rx={10}
                    fill="white"
                    stroke="#ccc"
                  />
                  <text textAnchor="middle" dominantBaseline="middle" fontSize={12}>
                    {name}
                  </text>
                </g>
              )
            })}
        </g>
      </svg>
    </div>
  )
}
