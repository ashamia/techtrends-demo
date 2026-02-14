import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { zoom } from 'd3-zoom'
import { select } from 'd3-selection'
import { quadtree } from 'd3-quadtree'
import { polygonContains } from 'd3-polygon'
import { computeHulls, hullToPath, filterHullsForLabels, computeParentHulls } from '../hooks/useHulls'
import { buildColorScale } from '../utils/colors'
import { getCategoryIdAtLevel } from '../utils/hierarchy'
import { placeLabelsBesideHulls } from '../utils/labelPlacement'
import { wrapLabelText } from '../utils/textWrap'
import {
  DOT_RADIUS_HOVER, DOT_RADIUS_MATCH, DOT_RADIUS_NON_MATCH,
  DOT_RADIUS_L1, DOT_RADIUS_L2, DOT_RADIUS_L3,
  LABEL_ZOOM_THRESHOLD, LABEL_UNIFORM_SIZE, LABEL_FIXED_SCREEN_SIZE, LABEL_CHAR_WIDTH_RATIO, LABEL_PILL_PADDING_H,
  LABEL_FONT_SIZE, LABEL_FONT_SIZE_L1, LABEL_FONT_SIZE_L2, LABEL_FONT_SIZE_L3,
  LABEL_MIN_WIDTH, LABEL_MIN_WIDTH_L1, LABEL_MIN_WIDTH_L2, LABEL_MIN_WIDTH_L3,
  LABEL_MAX_HEIGHT, LABEL_MAX_HEIGHT_L1, LABEL_MAX_HEIGHT_L2, LABEL_MAX_HEIGHT_L3,
  LABEL_PILL_OPACITY, LABEL_PILL_BG_COLOR, LABEL_PILL_BORDER_COLOR,
  LABEL_MAX_WIDTH, LABEL_LINE_HEIGHT_RATIO,
  LABEL_LEADER_LINE_COLOR, LABEL_LEADER_LINE_STROKE_WIDTH, LABEL_VIEWPORT_MARGIN,
  HULL_OPACITY, HULL_OPACITY_DIMMED, HULL_OPACITY_PARENT,
  HULL_LEVEL_TRANSITION_MS,
} from '../config'
import type { Startup, Category, HierarchyLevel } from '../types'
import type { ZoomTransform } from 'd3-zoom'
import type { MatchInfo } from '../utils/search'

function getLabelFontSize(level: HierarchyLevel): number {
  if (LABEL_UNIFORM_SIZE) return LABEL_FONT_SIZE
  if (level === 1) return LABEL_FONT_SIZE_L1
  if (level === 2) return LABEL_FONT_SIZE_L2
  return LABEL_FONT_SIZE_L3
}

function getLabelMinWidth(level: HierarchyLevel): number {
  if (LABEL_UNIFORM_SIZE) return LABEL_MIN_WIDTH
  if (level === 1) return LABEL_MIN_WIDTH_L1
  if (level === 2) return LABEL_MIN_WIDTH_L2
  return LABEL_MIN_WIDTH_L3
}

function getLabelHeight(level: HierarchyLevel): number {
  if (LABEL_UNIFORM_SIZE) return LABEL_MAX_HEIGHT
  if (level === 1) return LABEL_MAX_HEIGHT_L1
  if (level === 2) return LABEL_MAX_HEIGHT_L2
  return LABEL_MAX_HEIGHT_L3
}

function getDotRadius(level: HierarchyLevel, searchActive: boolean, isMatch: boolean, isHover: boolean): number {
  if (searchActive) {
    if (isMatch) return isHover ? DOT_RADIUS_HOVER : DOT_RADIUS_MATCH
    return DOT_RADIUS_NON_MATCH
  }
  if (isHover) return DOT_RADIUS_HOVER
  if (level === 1) return DOT_RADIUS_L1
  if (level === 2) return DOT_RADIUS_L2
  return DOT_RADIUS_L3
}

interface MapViewProps {
  startups: Startup[]
  categories: Category[]
  width: number
  height: number
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
  transform: ZoomTransform
  activeLevel: HierarchyLevel
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
  categories,
  width,
  height,
  bounds,
  transform,
  activeLevel,
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
  const [outgoingHulls, setOutgoingHulls] = useState<{ categoryId: string; points: [number, number][]; centroid: [number, number] }[]>([])
  const [outgoingLabels, setOutgoingLabels] = useState<{ categoryId: string; points: [number, number][]; centroid: [number, number] }[]>([])
  const [transitioningFromLevel, setTransitioningFromLevel] = useState<HierarchyLevel | null>(null)
  const [fadeOut, setFadeOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevLevelRef = useRef(activeLevel)

  const categoryIdsAtLevel = new Set(startups.map((s) => getCategoryIdAtLevel(s, activeLevel)))
  const hulls = computeHulls(startups, activeLevel)
  const parentHulls = computeParentHulls(startups, hulls, activeLevel)
  const hullsForLabels = filterHullsForLabels(hulls, startups, activeLevel)
  const allCategoryIds = new Set([
    ...categoryIdsAtLevel,
    ...parentHulls.map((h) => h.categoryId),
    ...outgoingHulls.map((h) => h.categoryId),
  ])
  const colorScale = buildColorScale([...allCategoryIds])
  const categoryNameById = new Map(categories.map((c) => [c.category_id, c.category_name]))

  const labelDataForPlacement = useMemo(() => {
    const scaleForPlacement = 1
    const fontSize = getLabelFontSize(activeLevel) * scaleForPlacement
    const minWidth = getLabelMinWidth(activeLevel) * scaleForPlacement
    const labelHeight = getLabelHeight(activeLevel) * scaleForPlacement
    const lineHeight = fontSize * LABEL_LINE_HEIGHT_RATIO
    const paddingV = 6 * scaleForPlacement
    const maxTextWidth = LABEL_MAX_WIDTH * scaleForPlacement - 2 * LABEL_PILL_PADDING_H * scaleForPlacement
    const nameById = new Map(categories.map((c) => [c.category_id, c.category_name]))
    return hullsForLabels.map((h) => {
      const name = nameById.get(h.categoryId) ?? h.categoryId
      const matchCount = searchActive ? (categoryMatchCounts.get(h.categoryId) ?? 0) : null
      const labelText = searchActive && matchCount !== null ? `${name} (${matchCount})` : name
      const lines = wrapLabelText(labelText, maxTextWidth, fontSize, LABEL_CHAR_WIDTH_RATIO)
      const longestLineLen = Math.max(...lines.map((l) => l.length))
      const labelWidth = Math.max(
        minWidth,
        longestLineLen * fontSize * LABEL_CHAR_WIDTH_RATIO + 2 * LABEL_PILL_PADDING_H * scaleForPlacement
      )
      const wrappedHeight = Math.max(labelHeight, lines.length * lineHeight + 2 * paddingV)
      return { hull: h, lines, hasMatches: matchCount === null || matchCount > 0, width: labelWidth, height: wrappedHeight }
    })
  }, [hullsForLabels, activeLevel, searchActive, categoryMatchCounts, categories])

  const placedLabels = useMemo(() => {
    const labelDims = labelDataForPlacement.map((item) => ({ width: item.width, height: item.height }))
    return placeLabelsBesideHulls(hullsForLabels, labelDims, 1)
  }, [hullsForLabels, labelDataForPlacement])

  useEffect(() => {
    if (activeLevel !== prevLevelRef.current) {
      const prevLevel = prevLevelRef.current
      const prevHulls = computeHulls(startups, prevLevel)
      const prevLabels = filterHullsForLabels(prevHulls, startups, prevLevel)
      setOutgoingHulls(prevHulls)
      setOutgoingLabels(prevLabels)
      setTransitioningFromLevel(prevLevel)
      setFadeOut(false)
      prevLevelRef.current = activeLevel
      const raf = requestAnimationFrame(() => {
        setFadeOut(true)
      })
      const t = setTimeout(() => {
        setOutgoingHulls([])
        setOutgoingLabels([])
        setTransitioningFromLevel(null)
      }, HULL_LEVEL_TRANSITION_MS)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(t)
      }
    }
  }, [activeLevel, startups])

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

        const groupId = getCategoryIdAtLevel(s, activeLevel)
        if (searchActive) {
          if (isMatch) {
            color = isUncategorized ? '#888' : (colorScale.get(groupId) ?? colorScale.get(s.category_id) ?? '#999')
            alpha = 0.95
            r = getDotRadius(activeLevel, true, true, s.id === hoveredId)
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
          color = isUncategorized ? '#888' : (colorScale.get(groupId) ?? colorScale.get(s.category_id) ?? '#999')
          alpha = 0.85
          r = getDotRadius(activeLevel, false, false, s.id === hoveredId)
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
  }, [startups, transform, bounds, colorScale, hoveredId, selectedId, width, height, searchActive, matchIds, activeLevel])

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
      const r = getDotRadius(activeLevel, !!searchActive, matchIds?.has(hit.id) ?? false, hoveredId === hit.id)
      const threshold = r * 2.5
      return dist < threshold ? hit : null
    },
    [startups, hoveredId, activeLevel, searchActive, matchIds]
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
          const name = categoryNameById.get(hull.categoryId) ?? hull.categoryId
          onCategoryClick(hull.categoryId, name)
          return
        }
      }
    },
    [hulls, categoryNameById, transform, findNearestStartup, onStartupClick, onCategoryClick]
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
          {outgoingHulls.length > 0 && (
            <g style={{ opacity: fadeOut ? 0 : 1, transition: `opacity ${HULL_LEVEL_TRANSITION_MS}ms ease`, pointerEvents: 'none' }}>
              {outgoingHulls.map((h) => {
                const catColor = colorScale.get(h.categoryId)
                const fillOpacity = HULL_OPACITY
                const fillColor = catColor
                  ? `rgba(${parseInt(catColor.slice(1, 3), 16)},${parseInt(catColor.slice(3, 5), 16)},${parseInt(catColor.slice(5, 7), 16)},${fillOpacity})`
                  : `rgba(0,0,0,${fillOpacity})`
                return (
                  <path key={`out-${h.categoryId}`} d={hullToPath(h)} fill={fillColor} className="hull-path" />
                )
              })}
            </g>
          )}
          <g style={outgoingHulls.length > 0 ? { opacity: fadeOut ? 1 : 0, transition: `opacity ${HULL_LEVEL_TRANSITION_MS}ms ease` } : undefined}>
          {parentHulls.map((h) => {
            const catColor = colorScale.get(h.categoryId)
            const fillColor = catColor
              ? `rgba(${parseInt(catColor.slice(1, 3), 16)},${parseInt(catColor.slice(3, 5), 16)},${parseInt(catColor.slice(5, 7), 16)},${HULL_OPACITY_PARENT})`
              : `rgba(0,0,0,${HULL_OPACITY_PARENT})`
            const strokeColor = catColor ?? '#999'
            return (
              <path
                key={`parent-${h.categoryId}`}
                d={hullToPath(h)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={1}
                strokeOpacity={0.2}
                className="hull-path hull-path-parent"
                onClick={(e) => {
                  e.stopPropagation()
                  const name = categoryNameById.get(h.categoryId) ?? h.categoryId
                  onCategoryClick(h.categoryId, name)
                }}
              />
            )
          })}
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
                const name = categoryNameById.get(h.categoryId) ?? h.categoryId
                onCategoryClick(h.categoryId, name)
              }}
            />
          )})}
          </g>
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
          {showLabels && outgoingLabels.length > 0 && (() => {
            const outLevel = transitioningFromLevel ?? 2
            const k = transform.k
            const scale = LABEL_FIXED_SCREEN_SIZE ? 1 / k : 1
            const outFontSize = getLabelFontSize(outLevel) * scale
            const outMinWidth = getLabelMinWidth(outLevel) * scale
            const outBaseHeight = getLabelHeight(outLevel) * scale
            const rx = Math.max(2, 6 * scale)
            const outLineHeight = outFontSize * LABEL_LINE_HEIGHT_RATIO
            const outPaddingV = 6 * scale
            const outMaxTextWidth = LABEL_MAX_WIDTH * scale - 2 * LABEL_PILL_PADDING_H * scale
            const outItems = outgoingLabels.map((h) => {
              const name = categoryNameById.get(h.categoryId) ?? h.categoryId
              const lines = wrapLabelText(name, outMaxTextWidth, outFontSize, LABEL_CHAR_WIDTH_RATIO)
              const longestLineLen = Math.max(...lines.map((l) => l.length))
              const labelWidth = Math.max(outMinWidth, longestLineLen * outFontSize * LABEL_CHAR_WIDTH_RATIO + 2 * LABEL_PILL_PADDING_H * scale)
              const outHeight = Math.max(outBaseHeight, lines.length * outLineHeight + 2 * outPaddingV)
              return { hull: h, lines, labelWidth, outHeight }
            })
            const outDims = outItems.map((o) => ({ width: o.labelWidth, height: o.outHeight }))
            const outPlaced = placeLabelsBesideHulls(outgoingLabels, outDims, k)
            const dashArray = `${4 * scale},${4 * scale}`
            const outMargin = LABEL_VIEWPORT_MARGIN / k
            const outVisibleMinX = Math.min((-transform.x) / k, (width - transform.x) / k) - outMargin
            const outVisibleMaxX = Math.max((-transform.x) / k, (width - transform.x) / k) + outMargin
            const outVisibleMinY = Math.min((-transform.y) / k, (height - transform.y) / k) - outMargin
            const outVisibleMaxY = Math.max((-transform.y) / k, (height - transform.y) / k) + outMargin
            const outVisibleIndices = outItems
              .map((_, i) => i)
              .filter((i) => {
                const { rect } = outPlaced[i]!
                return rect.x + rect.width > outVisibleMinX && rect.x < outVisibleMaxX &&
                  rect.y + rect.height > outVisibleMinY && rect.y < outVisibleMaxY
              })
            return (
              <g style={{ opacity: fadeOut ? 0 : 1, transition: `opacity ${HULL_LEVEL_TRANSITION_MS}ms ease`, pointerEvents: 'none' }}>
                {outVisibleIndices.map((i) => {
                  const item = outItems[i]!
                  const { rect, hullCentroid } = outPlaced[i]!
                  const halfW = item.labelWidth / 2
                  const halfH = item.outHeight / 2
                  const gx = rect.x + rect.width / 2
                  const gy = rect.y + rect.height / 2
                  return (
                    <g key={`out-label-${item.hull.categoryId}`}>
                      <line
                        x1={hullCentroid[0]}
                        y1={hullCentroid[1]}
                        x2={gx}
                        y2={gy}
                        stroke={LABEL_LEADER_LINE_COLOR}
                        strokeWidth={LABEL_LEADER_LINE_STROKE_WIDTH / k}
                        strokeDasharray={dashArray}
                        fill="none"
                      />
                      <g transform={`translate(${gx},${gy})`}>
                        <rect x={-halfW} y={-halfH} width={item.labelWidth} height={item.outHeight} rx={rx} fill={LABEL_PILL_BG_COLOR} fillOpacity={LABEL_PILL_OPACITY} stroke={LABEL_PILL_BORDER_COLOR} />
                        <text textAnchor="middle" fontSize={outFontSize} x={0} y={-((item.lines.length - 1) / 2) * outLineHeight}>
                          {item.lines.map((line, lineIdx) => (
                            <tspan key={lineIdx} x={0} dy={lineIdx === 0 ? 0 : outLineHeight}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    </g>
                  )
                })}
              </g>
            )
          })()}
          {showLabels && (() => {
            const k = transform.k
            const scale = LABEL_FIXED_SCREEN_SIZE ? 1 / k : 1
            const margin = LABEL_VIEWPORT_MARGIN / k
            const visibleMinX = Math.min((-transform.x) / k, (width - transform.x) / k) - margin
            const visibleMaxX = Math.max((-transform.x) / k, (width - transform.x) / k) + margin
            const visibleMinY = Math.min((-transform.y) / k, (height - transform.y) / k) - margin
            const visibleMaxY = Math.max((-transform.y) / k, (height - transform.y) / k) + margin
            const fontSize = getLabelFontSize(activeLevel) * scale
            const labelItems = labelDataForPlacement.map((item) => ({
              ...item,
              fontSize,
              lineHeight: fontSize * LABEL_LINE_HEIGHT_RATIO,
              renderWidth: item.width * scale,
              renderHeight: item.height * scale,
            }))

            const dashArray = `${4 * scale},${4 * scale}`

            const visibleIndices: number[] = []
            for (let i = 0; i < labelItems.length; i++) {
              const { rect } = placedLabels[i]!
              if (rect.x + rect.width > visibleMinX && rect.x < visibleMaxX &&
                  rect.y + rect.height > visibleMinY && rect.y < visibleMaxY) {
                visibleIndices.push(i)
              }
            }

            return (
              <g style={outgoingLabels.length > 0 ? { opacity: fadeOut ? 1 : 0, transition: `opacity ${HULL_LEVEL_TRANSITION_MS}ms ease` } : undefined}>
                {visibleIndices.map((i) => {
                  const item = labelItems[i]!
                  const { rect, hullCentroid } = placedLabels[i]!
                  const halfW = item.renderWidth / 2
                  const halfH = item.renderHeight / 2
                  const gx = rect.x + rect.width / 2
                  const gy = rect.y + rect.height / 2
                  const rx = Math.max(2, 6 * scale)
                  return (
                    <g
                      key={`label-${item.hull.categoryId}`}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCategoryClick(item.hull.categoryId, categoryNameById.get(item.hull.categoryId) ?? item.hull.categoryId)
                      }}
                    >
                      <line
                        x1={hullCentroid[0]}
                        y1={hullCentroid[1]}
                        x2={gx}
                        y2={gy}
                        stroke={LABEL_LEADER_LINE_COLOR}
                        strokeWidth={LABEL_LEADER_LINE_STROKE_WIDTH / k}
                        strokeDasharray={dashArray}
                        fill="none"
                      />
                      <g transform={`translate(${gx},${gy})`}>
                        <rect
                          x={-halfW}
                          y={-halfH}
                          width={item.renderWidth}
                          height={item.renderHeight}
                          rx={rx}
                          fill={LABEL_PILL_BG_COLOR}
                          fillOpacity={LABEL_PILL_OPACITY}
                          stroke={LABEL_PILL_BORDER_COLOR}
                        />
                        <text
                          textAnchor="middle"
                          fontSize={item.fontSize}
                          fontWeight={searchActive && item.hasMatches ? 'bold' : 'normal'}
                          x={0}
                          y={-((item.lines.length - 1) / 2) * item.lineHeight}
                        >
                          {item.lines.map((line, lineIdx) => (
                            <tspan key={lineIdx} x={0} dy={lineIdx === 0 ? 0 : item.lineHeight}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    </g>
                  )
                })}
              </g>
            )
          })()}
        </g>
      </svg>
    </div>
  )
}
