import { useState, useCallback } from 'react'
import { FUNDING_BUCKETS } from '../config'
import { computeAgeBounds } from '../hooks/useFilteredData'
import { DualRangeSlider } from './DualRangeSlider'
import type { Startup } from '../types'
import type { FilterState } from '../types'

interface FiltersPanelProps {
  startups: Startup[]
  filter: FilterState
  onFilterChange: (f: FilterState) => void
  onResetAll: () => void
}

export function FiltersPanel({
  startups,
  filter,
  onFilterChange,
  onResetAll,
}: FiltersPanelProps) {
  const [ageOpen, setAgeOpen] = useState(true)
  const [userGroupOpen, setUserGroupOpen] = useState(true)
  const [fundingOpen, setFundingOpen] = useState(true)

  const userGroups = Array.from(
    new Set(startups.map((s) => s.user_group).filter(Boolean))
  ).sort()

  const [minAgeUI, maxAgeUI] = computeAgeBounds(startups)
  const ageCount = 1
  const userGroupCount = filter.userGroups.size
  const fundingCount = filter.fundingBuckets.size
  const hasActiveFilters = userGroupCount < userGroups.length || fundingCount < FUNDING_BUCKETS.length ||
    filter.ageRange[0] > minAgeUI || filter.ageRange[1] < maxAgeUI

  const setUserGroups = useCallback(
    (groups: Set<string>) => {
      onFilterChange({ ...filter, userGroups: groups })
    },
    [filter, onFilterChange]
  )

  const setAgeRange = useCallback(
    (range: [number, number]) => {
      onFilterChange({ ...filter, ageRange: range })
    },
    [filter, onFilterChange]
  )

  const setFundingBuckets = useCallback(
    (buckets: Set<string>) => {
      onFilterChange({ ...filter, fundingBuckets: buckets })
    },
    [filter, onFilterChange]
  )

  const toggleUserGroup = (g: string) => {
    const next = new Set(filter.userGroups)
    if (next.has(g)) next.delete(g)
    else next.add(g)
    setUserGroups(next)
  }

  const selectAllUserGroups = () => {
    setUserGroups(new Set(userGroups))
  }

  const clearUserGroups = () => {
    setUserGroups(new Set())
  }

  const fundingAll = () => {
    setFundingBuckets(new Set(FUNDING_BUCKETS.map((b) => b.id)))
  }

  const fundingClear = () => {
    setFundingBuckets(new Set())
  }

  const toggleFunding = (id: string) => {
    const next = new Set(filter.fundingBuckets)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFundingBuckets(next)
  }

  return (
    <>
      {hasActiveFilters && (
        <button type="button" className="reset-all-filters" onClick={onResetAll}>
          Reset All Filters
        </button>
      )}
      <div className="filter-card filter-card-collapsible">
        <button
          type="button"
          className="filter-section-label filter-toggle"
          onClick={() => setAgeOpen(!ageOpen)}
        >
          AGE ({ageCount}) {ageOpen ? '▾' : '▸'}
        </button>
        {ageOpen && (
          <>
            <div className="age-value">
              {filter.ageRange[0]} – {filter.ageRange[1]} years
            </div>
            <DualRangeSlider
              min={minAgeUI}
              max={maxAgeUI}
              value={filter.ageRange}
              onChange={setAgeRange}
            />
          </>
        )}
      </div>

      <div className="filter-card filter-card-collapsible">
        <button
          type="button"
          className="filter-section-label filter-toggle"
          onClick={() => setUserGroupOpen(!userGroupOpen)}
        >
          USER GROUP ({userGroupCount}) {userGroupOpen ? '▾' : '▸'}
        </button>
        {userGroupOpen && (
          <>
            <div className="filter-actions">
              <button type="button" onClick={selectAllUserGroups}>
                All
              </button>
              <button type="button" onClick={clearUserGroups}>
                Clear
              </button>
            </div>
            <div className="filter-chips">
              {userGroups.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip ${filter.userGroups.has(g) ? 'active' : ''}`}
                  onClick={() => toggleUserGroup(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="filter-card filter-card-collapsible">
        <button
          type="button"
          className="filter-section-label filter-toggle"
          onClick={() => setFundingOpen(!fundingOpen)}
        >
          TOTAL FUNDING ({fundingCount}) {fundingOpen ? '▾' : '▸'}
        </button>
        {fundingOpen && (
          <>
            <div className="filter-actions">
              <button type="button" onClick={fundingAll}>
                All
              </button>
              <button type="button" onClick={fundingClear}>
                Clear
              </button>
            </div>
            <div className="filter-chips">
              {FUNDING_BUCKETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`chip ${filter.fundingBuckets.has(b.id) ? 'active' : ''}`}
                  onClick={() => toggleFunding(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
