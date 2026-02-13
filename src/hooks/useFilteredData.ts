import { useMemo } from 'react'
import type { Startup } from '../types'
import type { FilterState } from '../types'
import { FUNDING_BUCKETS } from '../config'

const CURRENT_YEAR = new Date().getFullYear()

export function useFilteredStartups(
  startups: Startup[],
  filter: FilterState
): Startup[] {
  return useMemo(() => {
    return startups.filter((s) => {
      if (!filter.userGroups.has(s.user_group)) return false
      const age = s.year_founded > 0 ? CURRENT_YEAR - s.year_founded : -1
      if (age >= 0 && (age < filter.ageRange[0] || age > filter.ageRange[1])) return false
      const funding = s.total_funding >= 0 ? s.total_funding : 0
      const inBucket = FUNDING_BUCKETS.some(
        (b) =>
          filter.fundingBuckets.has(b.id) &&
          funding >= b.min &&
          funding < b.max
      )
      return inBucket
    })
  }, [startups, filter])
}

export function computeAgeBounds(startups: Startup[]): [number, number] {
  const ages = startups
    .map((s) => (s.year_founded > 0 ? CURRENT_YEAR - s.year_founded : -1))
    .filter((a) => a >= 0)
  if (ages.length === 0) return [0, 60]
  let minAge = Math.floor(Math.min(...ages))
  let maxAge = Math.ceil(Math.max(...ages))
  minAge = Math.max(0, minAge)
  maxAge = Math.min(60, maxAge)
  if (maxAge - minAge < 10) {
    const mid = (minAge + maxAge) / 2
    minAge = Math.max(0, Math.floor(mid - 5))
    maxAge = Math.min(60, Math.ceil(mid + 5))
  }
  return [minAge, maxAge]
}
