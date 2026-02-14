import type { Category, HierarchyLevel, Startup } from '../types'
import {
  ZOOM_L1_TO_L2,
  ZOOM_L2_TO_L1,
  ZOOM_L2_TO_L3,
  ZOOM_L3_TO_L2,
} from '../config'

export function getHierarchyLevel(
  k: number,
  lastLevel: HierarchyLevel | null,
  zoomingIn: boolean
): HierarchyLevel {
  if (lastLevel === null) {
    if (k <= ZOOM_L1_TO_L2) return 1
    if (k <= ZOOM_L2_TO_L3) return 2
    return 3
  }
  if (lastLevel === 1) {
    return k >= ZOOM_L1_TO_L2 ? 2 : 1
  }
  if (lastLevel === 2) {
    if (zoomingIn && k >= ZOOM_L2_TO_L3) return 3
    if (!zoomingIn && k <= ZOOM_L2_TO_L1) return 1
    return 2
  }
  return k <= ZOOM_L3_TO_L2 ? 2 : 3
}

export function getCategoryIdAtLevel(s: Startup, level: HierarchyLevel): string {
  if (level === 1 && s.level1_id) return s.level1_id
  if (level === 2 && s.level2_id) return s.level2_id
  if (level === 3 && s.level3_id) return s.level3_id
  return s.category_id
}

export function buildAncestorMap(categories: Category[]): Map<string, { level1: string; level2: string; level3: string }> {
  const byId = new Map<string, Category>()
  for (const c of categories) {
    byId.set(c.category_id, c)
  }

  const result = new Map<string, { level1: string; level2: string; level3: string }>()

  function walk(id: string): { level1: string; level2: string; level3: string } {
    const cached = result.get(id)
    if (cached) return cached

    const cat = byId.get(id)
    if (!cat) {
      const fallback = { level1: id, level2: id, level3: id }
      result.set(id, fallback)
      return fallback
    }

    const parentId = cat.parent_category_id?.trim() || ''
    const catLevel = cat.level ?? 2

    if (!parentId || catLevel === 1) {
      const v = { level1: id, level2: id, level3: id }
      result.set(id, v)
      return v
    }

    const parent = walk(parentId)
    const level1 = parent.level1
    const level2 = catLevel >= 2 ? id : parent.level2
    const level3 = catLevel >= 3 ? id : level2
    const v = { level1, level2, level3 }
    result.set(id, v)
    return v
  }

  for (const c of categories) {
    walk(c.category_id)
  }
  return result
}
