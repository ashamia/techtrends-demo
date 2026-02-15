import { csvParse } from 'd3-dsv'
import type { Trend, TrendVendor, TrendCategory } from '../types/trends'

const TREND_CATEGORIES: TrendCategory[] = ['Emerging Technologies', 'New Themes', 'Market Phases']

function parseNum(val: string): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

function asTrendCategory(val: string): TrendCategory {
  const s = String(val ?? '').trim()
  if (TREND_CATEGORIES.includes(s as TrendCategory)) return s as TrendCategory
  return 'Emerging Technologies'
}

export function parseTrendsCsv(csvText: string): Trend[] {
  const rows = csvParse(csvText)
  return rows.map((row) => ({
    id: String(row.id ?? row.trend_id ?? ''),
    name: String(row.name ?? row.trend_name ?? ''),
    detectionDate: String(row.detection_date ?? ''),
    description: String(row.description ?? ''),
    category: asTrendCategory(row.category ?? ''),
  }))
}

export function parseTrendVendorsCsv(csvText: string): TrendVendor[] {
  const rows = csvParse(csvText)
  return rows.map((row) => ({
    trendId: String(row.trend_id ?? ''),
    vendorName: String(row.vendor_name ?? row.name ?? ''),
    yearFounded: parseNum(row.year_founded ?? ''),
    fundingToDate: parseNum(row.funding_to_date ?? row.total_funding ?? ''),
    hqLocation: (() => {
      const loc = (row.hq_location ?? `${row.hq_city ?? ''}, ${row.hq_country ?? ''}`.replace(/^,\s*|,\s*$/g, '').trim()).trim()
      return loc ? String(loc) : '-'
    })(),
    url: String(row.url ?? row.website_url ?? ''),
  }))
}
