import { formatFunding } from '../utils/funding'
import type { Startup } from '../types'

interface MetricsPanelProps {
  searchActive: boolean
  startups: Startup[]
  matchingStartups: Startup[]
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function MetricsPanel({ searchActive, startups, matchingStartups }: MetricsPanelProps) {
  const source = searchActive ? matchingStartups : startups

  const avgFunding =
    source.length > 0
      ? source.reduce((sum, s) => sum + Math.max(0, s.total_funding), 0) / source.length
      : 0

  const ages = source
    .map((s) => (s.year_founded > 0 ? new Date().getFullYear() - s.year_founded : 0))
    .filter((a) => a >= 0)
  const medAge = median(ages)

  const byCategory = new Map<string, number>()
  for (const s of source) {
    byCategory.set(s.category_id, (byCategory.get(s.category_id) ?? 0) + 1)
  }
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]
  const topCategoryName = topCategory
    ? source.find((s) => s.category_id === topCategory[0])?.category_name ?? topCategory[0]
    : '—'

  const top3Funding = [...byCategory.entries()]
    .map(([catId, _]) => {
      const total = source
        .filter((s) => s.category_id === catId)
        .reduce((sum, s) => sum + Math.max(0, s.total_funding), 0)
      return total
    })
    .sort((a, b) => b - a)
    .slice(0, 3)
  const totalFunding = source.reduce((sum, s) => sum + Math.max(0, s.total_funding), 0)
  const top3Pct = totalFunding > 0 ? (top3Funding.reduce((a, b) => a + b, 0) / totalFunding) * 100 : 0

  return (
    <div className="metrics-panel">
      <div className="metric">
        <span className="metric-label">
          {searchActive ? 'Average funding (matching)' : 'Average funding'}
        </span>
        <span className="metric-value">{formatFunding(avgFunding)}</span>
      </div>
      <div className="metric">
        <span className="metric-label">Median age</span>
        <span className="metric-value">{medAge} years</span>
      </div>
      <div className="metric">
        <span className="metric-label">
          {searchActive ? 'Top category' : 'Largest category'}
        </span>
        <span className="metric-value">
          {topCategoryName} ({topCategory?.[1] ?? 0})
        </span>
      </div>
      <div className="metric">
        <span className="metric-label">
          {searchActive ? 'Funding concentration' : 'Fastest growing'}
        </span>
        <span className="metric-value">
          {searchActive ? `${Math.round(top3Pct)}% in top 3 categories` : 'AI/ML'}
        </span>
      </div>
    </div>
  )
}
