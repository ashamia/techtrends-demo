import { polygonHull, polygonCentroid } from 'd3-polygon'
import { curveCatmullRomClosed, line } from 'd3-shape'
import type { Startup } from '../types'
import type { HullPolygon } from '../types'
import { HULL_EXPANSION } from '../config'

export function computeHulls(startups: Startup[]): HullPolygon[] {
  const byCategory = new Map<string, Startup[]>()
  for (const s of startups) {
    const list = byCategory.get(s.category_id) ?? []
    list.push(s)
    byCategory.set(s.category_id, list)
  }

  const hulls: HullPolygon[] = []
  for (const [categoryId, list] of byCategory) {
    if (list.length < 3) continue
    const points: [number, number][] = list.map((s) => [s.x, s.y])
    const hull = polygonHull(points)
    if (!hull) continue
    const centroid = polygonCentroid(hull)
    const expanded = hull.map((p) => [
      centroid[0] + (p[0] - centroid[0]) * HULL_EXPANSION,
      centroid[1] + (p[1] - centroid[1]) * HULL_EXPANSION,
    ] as [number, number])
    hulls.push({ categoryId, points: expanded, centroid })
  }
  return hulls
}

export function hullToPath(hull: HullPolygon): string {
  const lineGen = line<[number, number]>()
    .curve(curveCatmullRomClosed)
  const pts = [...hull.points, hull.points[0]]
  const p = lineGen(pts)
  return p ?? ''
}
