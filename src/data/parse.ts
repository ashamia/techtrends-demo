import { csvParse } from 'd3-dsv'
import type { Startup, Category } from '../types'
import { buildAncestorMap } from '../utils/hierarchy'

const STARTUP_COLUMNS = [
  'id', 'name', 'website_url', 'x', 'y', 'category_id',
  'year_founded', 'total_funding', 'hq_country', 'hq_city', 'contact_person',
  'description', 'user_group'
] as const

const CATEGORY_COLUMNS = ['category_id', 'category_name', 'category_description'] as const

function parseNum(val: string): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

function hasColumns(row: Record<string, string>, cols: readonly string[]): boolean {
  return cols.every(c => row[c] !== undefined && row[c] !== '')
}

export function parseStartupsCsv(csvText: string): Startup[] {
  const rows = csvParse(csvText)
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    website_url: String(row.website_url ?? ''),
    x: parseNum(row.x),
    y: parseNum(row.y),
    category_id: String(row.category_id ?? ''),
    category_name: String(row.category_name ?? ''),
    year_founded: parseNum(row.year_founded),
    total_funding: parseNum(row.total_funding),
    hq_country: String(row.hq_country ?? ''),
    hq_city: String(row.hq_city ?? ''),
    contact_person: String(row.contact_person ?? ''),
    description: String(row.description ?? ''),
    user_group: String(row.user_group ?? ''),
  }))
}

function parseLevel(val: string): 1 | 2 | 3 | undefined {
  const n = parseInt(val, 10)
  if (n === 1 || n === 2 || n === 3) return n
  return undefined
}

export function parseCategoriesCsv(csvText: string): Category[] {
  const rows = csvParse(csvText)
  return rows.map((row) => {
    const parent = String(row.parent_category_id ?? '').trim()
    const level = parseLevel(String(row.level ?? ''))
    return {
      category_id: String(row.category_id ?? ''),
      category_name: String(row.category_name ?? ''),
      category_description: String(row.category_description ?? ''),
      ...(parent || level !== undefined ? {
        parent_category_id: parent || undefined,
        level: level ?? (parent ? 2 : 1),
      } : {}),
    }
  })
}

function normalizeCategoryId(id: string): string[] {
  const ids = [id]
  const match = id.match(/^cat-(\d+)$/)
  if (match) {
    ids.push(`cat${match[1]}`)
  }
  const match2 = id.match(/^cat(\d+)$/)
  if (match2) {
    ids.push(`cat-${match2[1]}`)
  }
  return ids
}

export function applyCategoriesToStartups(
  startups: Startup[],
  categories: Category[]
): void {
  const byId = new Map<string, Category>()
  for (const c of categories) {
    for (const id of normalizeCategoryId(c.category_id)) {
      byId.set(id, c)
    }
  }
  const hasHierarchy = categories.some((c) => c.parent_category_id !== undefined || c.level !== undefined)
  const ancestorMap = hasHierarchy ? buildAncestorMap(categories) : null

  for (const s of startups) {
    const cat = byId.get(s.category_id)
    if (cat) {
      s.category_name = cat.category_name
    }
    if (ancestorMap && cat) {
      const anc = ancestorMap.get(cat.category_id)
      if (anc) {
        s.level1_id = anc.level1
        s.level2_id = anc.level2
        s.level3_id = anc.level3
      } else {
        s.level1_id = s.category_id
        s.level2_id = s.category_id
        s.level3_id = s.category_id
      }
    } else if (ancestorMap) {
      s.level1_id = s.category_id
      s.level2_id = s.category_id
      s.level3_id = s.category_id
    } else {
      s.level1_id = s.category_id
      s.level2_id = s.category_id
      s.level3_id = s.category_id
    }
  }

  if (hasHierarchy && ancestorMap) {
    assignRootStartupsToChildren(startups, categories)
  }
}

function assignRootStartupsToChildren(startups: Startup[], categories: Category[]): void {
  const byParent = new Map<string, Category[]>()
  for (const c of categories) {
    const pid = c.parent_category_id?.trim() || ''
    if (!pid) continue
    const list = byParent.get(pid) ?? []
    list.push(c)
    byParent.set(pid, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.category_id.localeCompare(b.category_id))
  }

  const rootAssigned = startups.filter(
    (s) => s.level1_id && s.level1_id === s.level2_id && s.level2_id === s.level3_id
  )
  if (rootAssigned.length === 0) return

  const byRoot = new Map<string, Startup[]>()
  for (const s of rootAssigned) {
    const list = byRoot.get(s.level1_id!) ?? []
    list.push(s)
    byRoot.set(s.level1_id!, list)
  }

  for (const [rootId, list] of byRoot) {
    const l2Children = byParent.get(rootId)
    if (!l2Children || l2Children.length === 0) continue

    const sumX = list.reduce((a, s) => a + s.x, 0)
    const sumY = list.reduce((a, s) => a + s.y, 0)
    const cx = sumX / list.length
    const cy = sumY / list.length

    for (const s of list) {
      const angle = Math.atan2(s.y - cy, s.x - cx)
      const sector = Math.min(l2Children.length - 1, Math.max(0, Math.floor(((angle + Math.PI) / (2 * Math.PI)) * l2Children.length)))
      s.level2_id = l2Children[sector]!.category_id
    }

    const byL2 = new Map<string, Startup[]>()
    for (const s of list) {
      const l = byL2.get(s.level2_id!) ?? []
      l.push(s)
      byL2.set(s.level2_id!, l)
    }

    for (const [l2Id, inL2] of byL2) {
      const l3Children = byParent.get(l2Id)
      if (!l3Children || l3Children.length === 0) {
        for (const s of inL2) s.level3_id = l2Id
        continue
      }
      const c2x = inL2.reduce((a, x) => a + x.x, 0) / inL2.length
      const c2y = inL2.reduce((a, x) => a + x.y, 0) / inL2.length
      for (const s of inL2) {
        const angle2 = Math.atan2(s.y - c2y, s.x - c2x)
        const sector3 = Math.min(l3Children.length - 1, Math.max(0, Math.floor(((angle2 + Math.PI) / (2 * Math.PI)) * l3Children.length)))
        s.level3_id = l3Children[sector3]!.category_id
      }
    }
  }
}

export function validateStartupsColumns(csvText: string): boolean {
  const rows = csvParse(csvText)
  if (rows.length === 0) return true
  const first = rows[0] as Record<string, string>
  return hasColumns(first, STARTUP_COLUMNS)
}

export function validateCategoriesColumns(csvText: string): boolean {
  const rows = csvParse(csvText)
  if (rows.length === 0) return true
  const first = rows[0] as Record<string, string>
  return hasColumns(first, CATEGORY_COLUMNS)
}
