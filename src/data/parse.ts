import { csvParse } from 'd3-dsv'
import type { Startup, Category } from '../types'

const STARTUP_COLUMNS = [
  'id', 'name', 'website_url', 'x', 'y', 'category_id', 'category_name',
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

export function parseCategoriesCsv(csvText: string): Category[] {
  const rows = csvParse(csvText)
  return rows.map((row) => ({
    category_id: String(row.category_id ?? ''),
    category_name: String(row.category_name ?? ''),
    category_description: String(row.category_description ?? ''),
  }))
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
