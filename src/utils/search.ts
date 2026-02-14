import type { Startup, HierarchyLevel } from '../types'
import { getCategoryIdAtLevel } from './hierarchy'

export type MatchStrength = 'high' | 'medium' | 'low'

export interface MatchInfo {
  strength: MatchStrength
  matchedOn: string[]
}

export function matchStartups(
  startups: Startup[],
  query: string
): { matches: Startup[]; matchInfo: Map<string, MatchInfo> } {
  const q = query.trim().toLowerCase()
  if (!q) {
    return {
      matches: startups,
      matchInfo: new Map(startups.map((s) => [s.id, { strength: 'high', matchedOn: [] }])),
    }
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  const matches: Startup[] = []
  const matchInfo = new Map<string, MatchInfo>()

  for (const s of startups) {
    const matchedOn: string[] = []
    let strength: MatchStrength = 'low'

    const nameLower = (s.name ?? '').toLowerCase()
    const descLower = (s.description ?? '').toLowerCase()
    const catLower = (s.category_name ?? '').toLowerCase()

    for (const tok of tokens) {
      if (nameLower.includes(tok)) {
        if (!matchedOn.includes('name')) matchedOn.push('name')
        strength = 'high'
      }
      if (catLower.includes(tok)) {
        if (!matchedOn.includes('category')) matchedOn.push('category')
        if (strength !== 'high') strength = 'medium'
      }
      if (descLower.includes(tok)) {
        if (!matchedOn.includes('description')) matchedOn.push('description')
        if (strength === 'low') strength = 'medium'
      }
    }

    if (matchedOn.length > 0) {
      matches.push(s)
      matchInfo.set(s.id, { strength, matchedOn })
    }
  }

  return { matches, matchInfo }
}

export function getCategoryMatchCounts(
  startups: Startup[],
  matchIds: Set<string>,
  level: HierarchyLevel = 2
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const s of startups) {
    if (matchIds.has(s.id)) {
      const groupId = getCategoryIdAtLevel(s, level)
      counts.set(groupId, (counts.get(groupId) ?? 0) + 1)
    }
  }
  return counts
}
