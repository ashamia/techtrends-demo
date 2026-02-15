import { polygonContains } from 'd3-polygon'
import { LABEL_MIN_SPACING } from '../config'
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
}

function overlaps(a: LabelRect, b: LabelRect, gap: number): boolean {
  return (
    a.x + a.width + gap > b.x &&
    b.x + b.width + gap > a.x &&
    a.y + a.height + gap > b.y &&
    b.y + b.height + gap > a.y
  )
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

function clampToHull(rect: LabelRect, hull: HullPolygon): void {
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  if (polygonContains(hull.points, [centerX, centerY])) return
  const [cx, cy] = hull.centroid
  let t = 0
  const steps = 20
  for (let s = 1; s <= steps; s++) {
    t = s / steps
    const px = centerX + t * (cx - centerX)
    const py = centerY + t * (cy - centerY)
    if (polygonContains(hull.points, [px, py])) {
      rect.x = px - rect.width / 2
      rect.y = py - rect.height / 2
      return
    }
  }
  rect.x = cx - rect.width / 2
  rect.y = cy - rect.height / 2
}

function resolveLabelOverlaps(
  rects: LabelRect[],
  centroids: [number, number][],
  hulls: HullPolygon[],
  minGap: number = LABEL_MIN_SPACING,
  scale: number = 1
): LabelRect[] {
  const result = rects.map((r) => ({ ...r }))
  const maxIterations = 40
  const pushStrength = 0.4
  const anchorStrength = 0.2
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
        const nx = dx / dist
        const ny = dy / dist
        a.x -= nx * push
        a.y -= ny * push
        b.x += nx * push
        b.y += ny * push
        clampToHull(a, hulls[i]!)
        clampToHull(b, hulls[j]!)
        moved = true
      }
      const a = result[i]
      const ax = a.x + a.width / 2
      const ay = a.y + a.height / 2
      const [cx, cy] = centroids[i]!
      const pullDx = cx - ax
      const pullDy = cy - ay
      const pullDist = Math.hypot(pullDx, pullDy)
      if (pullDist > 0.5) {
        const pull = Math.min(pullDist * anchorStrength, 3)
        a.x += (pullDx / pullDist) * pull
        a.y += (pullDy / pullDist) * pull
        clampToHull(a, hulls[i]!)
        moved = true
      }
    }
    if (!moved) break
  }
  for (let i = 0; i < result.length; i++) {
    clampToHull(result[i]!, hulls[i]!)
  }
  return result
}

export function placeLabelsInsideHulls(
  hulls: HullPolygon[],
  labelDims: { width: number; height: number }[],
  scale: number = 1
): PlacedLabel[] {
  const indexedHulls = hulls.map((h, i) => ({ hull: h, index: i, area: getHullArea(h) }))
  indexedHulls.sort((a, b) => b.area - a.area)

  const rects: LabelRect[] = []
  const centroids: [number, number][] = []
  const order: number[] = []

  for (const { hull, index } of indexedHulls) {
    const dims = labelDims[index]!
    const [cx, cy] = hull.centroid
    rects.push({
      x: cx - dims.width / 2,
      y: cy - dims.height / 2,
      width: dims.width,
      height: dims.height,
    })
    centroids.push([cx, cy])
    order.push(index)
  }

  const hullsInOrder = indexedHulls.map((x) => x.hull)
  const resolvedRects = resolveLabelOverlaps(rects, centroids, hullsInOrder, LABEL_MIN_SPACING, scale)

  const byIndex = order.map((idx, i) => ({ index: idx, rect: resolvedRects[i]!, centroid: centroids[i]! }))
  byIndex.sort((a, b) => a.index - b.index)

  return byIndex.map(({ rect, centroid }) => ({
    rect,
    hullCentroid: centroid,
  }))
}
