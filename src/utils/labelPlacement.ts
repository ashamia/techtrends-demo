import { polygonContains } from 'd3-polygon'
import {
  LABEL_MIN_SPACING,
  LABEL_SIDE_CLEARANCE,
  LABEL_CANDIDATE_ANGLES,
  LABEL_MAX_DISTANCE_FACTOR,
  LABEL_DISTANCE_STEPS,
  HULL_BUFFER,
  MAX_RINGS,
  RING_GROWTH,
} from '../config'
import type { HullPolygon } from '../types'

export interface LabelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PlacedLabel {
  rect: LabelRect
  hullCentroid: [number, number]
  lineAnchor: [number, number]
  lineRoute: [number, number][]
}

function overlaps(a: LabelRect, b: LabelRect, gap: number): boolean {
  return (
    a.x + a.width + gap > b.x &&
    b.x + b.width + gap > a.x &&
    a.y + a.height + gap > b.y &&
    b.y + b.height + gap > a.y
  )
}

function segmentIntersectsSegment(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  const denom = (dx - cx) * (by - ay) - (dy - cy) * (bx - ax)
  if (Math.abs(denom) < 1e-10) return false
  const t = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom
  const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

function segmentIntersectsPolygon(
  ax: number, ay: number, bx: number, by: number,
  hull: HullPolygon
): boolean {
  const pts = hull.points
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const px = pts[i]![0]
    const py = pts[i]![1]
    const qx = pts[j]![0]
    const qy = pts[j]![1]
    if (segmentIntersectsSegment(ax, ay, bx, by, px, py, qx, qy)) return true
  }
  return false
}

function getHullBoundaryPoint(hull: HullPolygon, angle: number): [number, number] {
  const [cx, cy] = hull.centroid
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const pts = hull.points
  const n = pts.length
  let bestU = Infinity
  let best: [number, number] = [cx + dx * getHullExtent(hull), cy + dy * getHullExtent(hull)]

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const px = pts[i]![0]
    const py = pts[i]![1]
    const qx = pts[j]![0]
    const qy = pts[j]![1]
    const denom = (qx - px) * dy - (qy - py) * dx
    if (Math.abs(denom) < 1e-10) continue
    const t = ((py - cy) * dx - (px - cx) * dy) / denom
    const u = (Math.abs(dx) > 1e-10)
      ? (px - cx + t * (qx - px)) / dx
      : (py - cy + t * (qy - py)) / dy
    if (u > 0.01 && t >= 0 && t <= 1 && u < bestU) {
      bestU = u
      best = [cx + u * dx, cy + u * dy]
    }
  }
  return best
}

function lineIntersectsAnyHull(
  ax: number, ay: number, bx: number, by: number,
  hulls: HullPolygon[],
  excludeIndices: Set<number>
): boolean {
  for (let j = 0; j < hulls.length; j++) {
    if (excludeIndices.has(j)) continue
    if (segmentIntersectsPolygon(ax, ay, bx, by, hulls[j]!)) return true
  }
  return false
}

export function routeLeaderLine(
  labelEdge: [number, number],
  hullAnchor: [number, number],
  labelRect: LabelRect,
  hulls: HullPolygon[],
  myHullIndex: number
): [number, number][] {
  const exclude = new Set([myHullIndex])
  if (!lineIntersectsAnyHull(labelEdge[0], labelEdge[1], hullAnchor[0], hullAnchor[1], hulls, exclude)) {
    return [labelEdge, hullAnchor]
  }
  const [ex, ey] = labelEdge
  const [hx, hy] = hullAnchor
  const dx = hx - ex
  const dy = hy - ey
  const dist = Math.hypot(dx, dy) || 0.001
  const halfDiag = Math.hypot(labelRect.width, labelRect.height) / 2
  const perpX = -dy / dist
  const perpY = dx / dist

  const labelWaypointScales = [1.5, 2.5, 4, 6]
  const cardinalOffsets: [number, number][] = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7],
  ]
  for (const scale of labelWaypointScales) {
    const offset = halfDiag * scale
    for (const [sx, sy] of cardinalOffsets) {
      const wx = ex + sx * offset
      const wy = ey + sy * offset
      if (!lineIntersectsAnyHull(ex, ey, wx, wy, hulls, exclude) &&
          !lineIntersectsAnyHull(wx, wy, hx, hy, hulls, exclude)) {
        return [[ex, ey], [wx, wy], [hx, hy]]
      }
    }
  }

  const midScales = [0.5, 1, 1.5, 2.5, 4]
  for (const midScale of midScales) {
    const midX = (ex + hx) / 2
    const midY = (ey + hy) / 2
    const perpOffset = halfDiag * midScale
    for (const sign of [1, -1]) {
      const wx = midX + perpX * perpOffset * sign
      const wy = midY + perpY * perpOffset * sign
      if (!lineIntersectsAnyHull(ex, ey, wx, wy, hulls, exclude) &&
          !lineIntersectsAnyHull(wx, wy, hx, hy, hulls, exclude)) {
        return [[ex, ey], [wx, wy], [hx, hy]]
      }
    }
  }

  const bendScale = Math.min(halfDiag * 3, dist * 0.3)
  const wx = ex + perpX * bendScale
  const wy = ey + perpY * bendScale
  return [[ex, ey], [wx, wy], [hx, hy]]
}

export function getLabelEdgePoint(rect: LabelRect, anchor: [number, number]): [number, number] {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const [ax, ay] = anchor
  const dx = cx - ax
  const dy = cy - ay
  const halfW = rect.width / 2
  const halfH = rect.height / 2
  let t = 1
  if (Math.abs(dx) > 1e-10) {
    const tx = dx > 0 ? (dx - halfW) / dx : (dx + halfW) / dx
    if (tx > 0 && tx < t) t = tx
  }
  if (Math.abs(dy) > 1e-10) {
    const ty = dy > 0 ? (dy - halfH) / dy : (dy + halfH) / dy
    if (ty > 0 && ty < t) t = ty
  }
  return [ax + t * dx, ay + t * dy]
}

function wouldOverlapHull(rect: LabelRect, hulls: HullPolygon[]): boolean {
  for (let j = 0; j < hulls.length; j++) {
    if (rectIntersectsPolygon(rect, hulls[j]!)) return true
  }
  return false
}

export function resolveLabelOverlaps(
  rects: LabelRect[],
  anchors: [number, number][] | undefined,
  hulls: HullPolygon[] | undefined,
  minGap: number = LABEL_MIN_SPACING,
  scale: number = 1
): LabelRect[] {
  const result = rects.map((r) => ({ ...r }))
  const maxIterations = 50
  const pushStrength = 0.5
  const anchorStrength = 0.3
  const gap = minGap / scale

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i]
        const b = result[j]
        if (!overlaps(a, b, gap)) continue

        const ax = a.x + a.width / 2
        const ay = a.y + a.height / 2
        const bx = b.x + b.width / 2
        const by = b.y + b.height / 2
        const dx = bx - ax
        const dy = by - ay
        const dist = Math.hypot(dx, dy) || 0.001
        const overlapX = (a.width + b.width) / 2 + gap - Math.abs(dx)
        const overlapY = (a.height + b.height) / 2 + gap - Math.abs(dy)
        const push = Math.max(overlapX, overlapY, 0) * pushStrength
        let nx = dx / dist
        let ny = dy / dist
        if (anchors) {
          const anchorA = anchors[i]
          const anchorB = anchors[j]
          if (anchorA && anchorB) {
            const radialA = [ax - anchorA[0], ay - anchorA[1]]
            const radialB = [bx - anchorB[0], by - anchorB[1]]
            const lenA = Math.hypot(radialA[0], radialA[1]) || 0.001
            const lenB = Math.hypot(radialB[0], radialB[1]) || 0.001
            const perpA = [-radialA[1] / lenA, radialA[0] / lenA]
            const perpB = [-radialB[1] / lenB, radialB[0] / lenB]
            const dotA = nx * perpA[0] + ny * perpA[1]
            const dotB = nx * perpB[0] + ny * perpB[1]
            nx = perpA[0] * Math.sign(dotA) * 0.5 + perpB[0] * Math.sign(-dotB) * 0.5
            ny = perpA[1] * Math.sign(dotA) * 0.5 + perpB[1] * Math.sign(-dotB) * 0.5
            const nlen = Math.hypot(nx, ny) || 0.001
            nx /= nlen
            ny /= nlen
          }
        }
        const aNew = { ...a, x: a.x - nx * push, y: a.y - ny * push }
        const bNew = { ...b, x: b.x + nx * push, y: b.y + ny * push }
        const aWouldOverlap = hulls ? wouldOverlapHull(aNew, hulls) : false
        const bWouldOverlap = hulls ? wouldOverlapHull(bNew, hulls) : false
        if (!aWouldOverlap) {
          a.x = aNew.x
          a.y = aNew.y
          moved = true
        }
        if (!bWouldOverlap) {
          b.x = bNew.x
          b.y = bNew.y
          moved = true
        }
      }
      if (anchors && anchors[i]) {
        const a = result[i]
        const ax = a.x + a.width / 2
        const ay = a.y + a.height / 2
        const [anchorX, anchorY] = anchors[i]
        const pullDx = anchorX - ax
        const pullDy = anchorY - ay
        const pullDist = Math.hypot(pullDx, pullDy)
        if (pullDist > 0.5) {
          const pull = Math.min(pullDist * anchorStrength, 2)
          const aNew = { ...a, x: a.x + (pullDx / pullDist) * pull, y: a.y + (pullDy / pullDist) * pull }
          const wouldOverlap = hulls ? wouldOverlapHull(aNew, hulls) : false
          if (!wouldOverlap) {
            a.x = aNew.x
            a.y = aNew.y
            moved = true
          }
        }
      }
    }
    if (!moved) break
  }

  return result
}

function rectContainsPoint(
  x: number, y: number, w: number, h: number,
  px: number, py: number
): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h
}

function getHullBbox(hull: HullPolygon): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of hull.points) {
    minX = Math.min(minX, p[0])
    maxX = Math.max(maxX, p[0])
    minY = Math.min(minY, p[1])
    maxY = Math.max(maxY, p[1])
  }
  return { minX, maxX, minY, maxY }
}

export function computeBufferedHull(hull: HullPolygon, bufferPx: number, scale: number = 1): HullPolygon {
  const buffer = bufferPx / scale
  const [cx, cy] = hull.centroid
  const extent = getHullExtent(hull) || 1
  const factor = 1 + buffer / extent
  const points = hull.points.map(
    (p) => [cx + (p[0] - cx) * factor, cy + (p[1] - cy) * factor] as [number, number]
  )
  return { categoryId: hull.categoryId, points, centroid: [cx, cy] }
}

function rectIntersectsPolygon(rect: LabelRect, hull: HullPolygon): boolean {
  const pts = [rect.x, rect.y, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height]
  for (let i = 0; i < 4; i++) {
    const px = pts[i * 2]!
    const py = pts[i * 2 + 1]!
    if (polygonContains(hull.points, [px, py])) return true
  }
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  if (polygonContains(hull.points, [cx, cy])) return true
  if (rectContainsPoint(rect.x, rect.y, rect.width, rect.height, hull.centroid[0], hull.centroid[1])) return true
  return false
}

function getHullExtent(hull: HullPolygon): number {
  const [cx, cy] = hull.centroid
  let maxDist = 0
  for (const p of hull.points) {
    const d = Math.hypot(p[0] - cx, p[1] - cy)
    if (d > maxDist) maxDist = d
  }
  return maxDist
}

function getHullArea(hull: HullPolygon): number {
  let area = 0
  const n = hull.points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += hull.points[i]![0] * hull.points[j]![1]
    area -= hull.points[j]![0] * hull.points[i]![1]
  }
  return Math.abs(area) / 2
}

export function placeLabelsBesideHulls(
  hulls: HullPolygon[],
  labelDims: { width: number; height: number }[],
  scale: number = 1
): PlacedLabel[] {
  const clearance = LABEL_SIDE_CLEARANCE / scale
  const halfDiag = (w: number, h: number) => Math.hypot(w, h) / 2
  const bufferedHulls = hulls.map((h) => computeBufferedHull(h, HULL_BUFFER, scale))
  const indexedHulls = hulls.map((h, i) => ({ hull: h, buffered: bufferedHulls[i]!, index: i, area: getHullArea(h) }))
  indexedHulls.sort((a, b) => b.area - a.area)

  const placed: (PlacedLabel & { index: number; hullIndex: number })[] = []
  const placedRects: LabelRect[] = []
  const placedAnchors: [number, number][] = []
  const hullIndexByPlaced: number[] = []

  for (const { hull, buffered, index } of indexedHulls) {
    const dims = labelDims[index]!
    const extent = getHullExtent(hull)
    const bbox = getHullBbox(hull)
    const diag = Math.hypot(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY)
    const baseD = Math.max(12 / scale, 0.06 * diag, extent + halfDiag(dims.width, dims.height) + clearance)
    const gap = LABEL_MIN_SPACING / scale
    const angleStep = (2 * Math.PI) / LABEL_CANDIDATE_ANGLES

    let best: { x: number; y: number; score: number; dist: number; anchor: [number, number] } | null = null

    for (let ring = 0; ring < MAX_RINGS; ring++) {
      const d = baseD * Math.pow(RING_GROWTH, ring)
      const dMax = d * LABEL_MAX_DISTANCE_FACTOR

      for (let ai = 0; ai < LABEL_CANDIDATE_ANGLES; ai++) {
        const angle = ai * angleStep
        const anchor = getHullBoundaryPoint(hull, angle)

        for (let di = 0; di < LABEL_DISTANCE_STEPS; di++) {
          const dist = d + (dMax - d) * (di / Math.max(1, LABEL_DISTANCE_STEPS - 1))
          const lx = anchor[0] + dist * Math.cos(angle)
          const ly = anchor[1] + dist * Math.sin(angle)
          const rect: LabelRect = {
            x: lx - dims.width / 2,
            y: ly - dims.height / 2,
            width: dims.width,
            height: dims.height,
          }

          if (rectIntersectsPolygon(rect, buffered)) continue
          let valid = true
          let otherHullOverlapPenalty = 0
          for (let j = 0; j < hulls.length && valid; j++) {
            if (j === index) continue
            if (rectIntersectsPolygon(rect, bufferedHulls[j]!)) {
              otherHullOverlapPenalty += 4000
            }
          }
          for (let pi = 0; pi < placedRects.length; pi++) {
            if (overlaps(rect, placedRects[pi]!, gap)) valid = false
          }
          if (!valid) continue

          const labelCx = rect.x + rect.width / 2
          const labelCy = rect.y + rect.height / 2
          let linePenalty = 0
          for (let j = 0; j < hulls.length; j++) {
            if (j === index) continue
            if (segmentIntersectsPolygon(anchor[0], anchor[1], labelCx, labelCy, bufferedHulls[j]!)) {
              linePenalty += 2500
            }
          }
          const score = dist * 2 + linePenalty + otherHullOverlapPenalty

          if (best === null || score < best.score) {
            best = { x: rect.x, y: rect.y, score, dist, anchor }
          }
        }
      }
      if (best !== null) break
    }

    const fallbackAnchor = getHullBoundaryPoint(hull, 0)
    const fallbackDist = baseD * 1.2
    const fallbackRect: LabelRect = {
      x: fallbackAnchor[0] + fallbackDist - dims.width / 2,
      y: fallbackAnchor[1] - dims.height / 2,
      width: dims.width,
      height: dims.height,
    }

    const chosen = best as { x: number; y: number; anchor: [number, number] } | null
    const rect: LabelRect = chosen
      ? { x: chosen.x, y: chosen.y, width: dims.width, height: dims.height }
      : fallbackRect
    const chosenAnchor: [number, number] = chosen ? chosen.anchor : fallbackAnchor

    placedRects.push(rect)
    placedAnchors.push(chosenAnchor)
    hullIndexByPlaced.push(index)
    placed.push({
      rect,
      hullCentroid: [...hull.centroid],
      lineAnchor: chosenAnchor,
      lineRoute: [],
      index,
      hullIndex: index,
    })
  }

  placed.sort((a, b) => a.index - b.index)
  const orderRestored = placed.map((p) => ({
    rect: p.rect,
    hullCentroid: p.hullCentroid,
    lineAnchor: p.lineAnchor,
    hull: hulls[p.index]!,
    index: p.index,
    hullIndex: p.hullIndex,
  }))

  const rectsInOrder = orderRestored.map((p) => p.rect)
  const anchorsInOrder = orderRestored.map((p) => p.lineAnchor)
  const myHullIndices = orderRestored.map((p) => p.hullIndex)
  let resolvedRects = resolveLabelOverlaps(
    rectsInOrder,
    anchorsInOrder,
    bufferedHulls,
    LABEL_MIN_SPACING,
    scale
  )

  return orderRestored.map((p, i) => {
    const rect = resolvedRects[i]!
    const labelEdge = getLabelEdgePoint(rect, p.lineAnchor)
    const route = routeLeaderLine(labelEdge, p.lineAnchor, rect, bufferedHulls, myHullIndices[i]!)
    return {
      rect,
      hullCentroid: p.hullCentroid,
      lineAnchor: p.lineAnchor,
      lineRoute: route,
    }
  })
}
