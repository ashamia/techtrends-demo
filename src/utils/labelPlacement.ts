import { polygonContains } from 'd3-polygon'
import {
  LABEL_MIN_SPACING,
  LABEL_SIDE_CLEARANCE,
  LABEL_CANDIDATE_ANGLES,
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
}

function overlaps(a: LabelRect, b: LabelRect, gap: number): boolean {
  return (
    a.x + a.width + gap > b.x &&
    b.x + b.width + gap > a.x &&
    a.y + a.height + gap > b.y &&
    b.y + b.height + gap > a.y
  )
}

export function resolveLabelOverlaps(
  rects: LabelRect[],
  minGap: number = LABEL_MIN_SPACING,
  scale: number = 1
): LabelRect[] {
  const result = rects.map((r) => ({ ...r }))
  const maxIterations = 80
  const pushStrength = 0.6

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
        moved = true
      }
    }
    if (!moved) break
  }

  return result
}

function rectContainsPoint(
  x: number,
  y: number,
  w: number,
  h: number,
  px: number,
  py: number
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

function rectsOverlap(a: LabelRect, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x + a.width > b.x && b.x + b.width > a.x && a.y + a.height > b.y && b.y + b.height > a.y
}

function labelOverlapsHull(
  rect: LabelRect,
  hull: HullPolygon,
  excludeCentroid: [number, number]
): boolean {
  const [cx, cy] = excludeCentroid
  const tol = 1e-6
  if (Math.abs(hull.centroid[0] - cx) < tol && Math.abs(hull.centroid[1] - cy) < tol) return false
  const bbox = getHullBbox(hull)
  const hullRect = { x: bbox.minX, y: bbox.minY, width: bbox.maxX - bbox.minX, height: bbox.maxY - bbox.minY }
  if (!rectsOverlap(rect, hullRect)) return false
  const corners: [number, number][] = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
    [rect.x, rect.y + rect.height],
  ]
  for (const p of corners) {
    if (polygonContains(hull.points, p)) return true
  }
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  if (polygonContains(hull.points, [centerX, centerY])) return true
  if (rectContainsPoint(rect.x, rect.y, rect.width, rect.height, hull.centroid[0], hull.centroid[1])) {
    return true
  }
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
  const indexedHulls = hulls.map((h, i) => ({ hull: h, index: i, area: getHullArea(h) }))
  indexedHulls.sort((a, b) => b.area - a.area)

  const placed: (PlacedLabel & { index: number })[] = []
  const placedRects: LabelRect[] = []

  for (const { hull, index } of indexedHulls) {
    const dims = labelDims[index]!
    const extent = getHullExtent(hull)
    const dist = extent + halfDiag(dims.width, dims.height) + clearance
    const angleStep = (2 * Math.PI) / LABEL_CANDIDATE_ANGLES

    let best: { x: number; y: number; score: number } | null = null

    for (let i = 0; i < LABEL_CANDIDATE_ANGLES; i++) {
      const angle = i * angleStep
      const lx = hull.centroid[0] + dist * Math.cos(angle)
      const ly = hull.centroid[1] + dist * Math.sin(angle)
      const rect: LabelRect = {
        x: lx - dims.width / 2,
        y: ly - dims.height / 2,
        width: dims.width,
        height: dims.height,
      }

      let score = 0
      for (const pr of placedRects) {
        const gap = LABEL_MIN_SPACING / scale
        if (overlaps(rect, pr, gap)) score += 1000
      }
      for (let j = 0; j < hulls.length; j++) {
        if (j === index) continue
        const other = hulls[j]!
        if (labelOverlapsHull(rect, other, hull.centroid)) score += 500
      }
      score += dist * 0.1

      if (best === null || score < best.score) {
        best = { x: rect.x, y: rect.y, score }
      }
    }

    const rect: LabelRect = {
      x: best!.x,
      y: best!.y,
      width: dims.width,
      height: dims.height,
    }
    placedRects.push(rect)
    placed.push({ rect, hullCentroid: [...hull.centroid], index })
  }

  placed.sort((a, b) => a.index - b.index)
  const orderRestored = placed.map(({ rect, hullCentroid }) => ({ rect, hullCentroid }))

  const rectsInOrder = orderRestored.map((p) => p.rect)
  const resolvedRects = resolveLabelOverlaps(rectsInOrder, undefined, scale)

  return orderRestored.map((p, i) => ({
    rect: resolvedRects[i]!,
    hullCentroid: p.hullCentroid,
  }))
}
