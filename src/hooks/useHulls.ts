import { polygonHull, polygonCentroid } from 'd3-polygon'
import { curveCatmullRomClosed, line } from 'd3-shape'
import type { Startup } from '../types'
import type { HullPolygon } from '../types'
import type { HierarchyLevel } from '../types'
import { HULL_EXPANSION } from '../config'
import { getCategoryIdAtLevel } from '../utils/hierarchy'
import { MIN_LABEL_COUNT, MIN_LABEL_COUNT_L2, MIN_LABEL_COUNT_L3 } from '../config'

export function computeHulls(startups: Startup[], level: HierarchyLevel = 2): HullPolygon[] {
  const byCategory = new Map<string, Startup[]>()
  for (const s of startups) {
    const groupId = getCategoryIdAtLevel(s, level)
    const list = byCategory.get(groupId) ?? []
    list.push(s)
    byCategory.set(groupId, list)
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

function getMinLabelCount(level: HierarchyLevel): number {
  if (level === 1) return MIN_LABEL_COUNT
  if (level === 2) return MIN_LABEL_COUNT_L2
  return MIN_LABEL_COUNT_L3
}

export function filterHullsForLabels(hulls: HullPolygon[], startups: Startup[], level: HierarchyLevel): HullPolygon[] {
  const byCategory = new Map<string, number>()
  for (const s of startups) {
    const groupId = getCategoryIdAtLevel(s, level)
    byCategory.set(groupId, (byCategory.get(groupId) ?? 0) + 1)
  }
  const minCount = getMinLabelCount(level)
  return hulls.filter((h) => (byCategory.get(h.categoryId) ?? 0) >= minCount)
}

export function computeParentHulls(
  startups: Startup[],
  currentHulls: HullPolygon[],
  activeLevel: HierarchyLevel
): HullPolygon[] {
  if (activeLevel === 1) return []
  const parentLevel = activeLevel === 2 ? 1 : 2
  const currentCategoryIds = new Set(currentHulls.map((h) => h.categoryId))
  const parentCategoryIds = new Set<string>()
  for (const s of startups) {
    const currentId = getCategoryIdAtLevel(s, activeLevel)
    if (currentCategoryIds.has(currentId)) {
      const parentId = getCategoryIdAtLevel(s, parentLevel)
      parentCategoryIds.add(parentId)
    }
  }
  return computeHulls(startups, parentLevel).filter((h) => parentCategoryIds.has(h.categoryId))
}

export function hullToPath(hull: HullPolygon): string {
  const lineGen = line<[number, number]>()
    .curve(curveCatmullRomClosed)
  const pts = [...hull.points, hull.points[0]]
  const p = lineGen(pts)
  return p ?? ''
}
