import { useState, useCallback } from 'react'
import { FUNDING_BUCKETS } from '../config'
import { computeAgeBounds } from '../hooks/useFilteredData'
import type { Startup } from '../types'
import type { FilterState } from '../types'

interface FiltersPanelProps {
  startups: Startup[]
  filter: FilterState
  onFilterChange: (f: FilterState) => void
}

export function FiltersPanel({
  startups,
  filter,
  onFilterChange,
}: FiltersPanelProps) {
  const [userGroupOpen, setUserGroupOpen] = useState(false)
  const userGroups = Array.from(
    new Set(startups.map((s) => s.user_group).filter(Boolean))
  ).sort()

  const [minAgeUI, maxAgeUI] = computeAgeBounds(startups)

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
    <div className="filters-panel">
      <div className="filter-section">
        <button
          type="button"
          className="filter-toggle"
          onClick={() => setUserGroupOpen(!userGroupOpen)}
        >
          User Group
        </button>
        {userGroupOpen && (
          <div className="filter-dropdown">
            <div className="filter-actions">
              <button type="button" onClick={selectAllUserGroups}>
                All
              </button>
              <button type="button" onClick={clearUserGroups}>
                Clear
              </button>
            </div>
            {userGroups.map((g) => (
              <label key={g} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filter.userGroups.has(g)}
                  onChange={() => toggleUserGroup(g)}
                />
                {g}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="filter-section">
        <label className="filter-label">
          Age: {filter.ageRange[0]} – {filter.ageRange[1]} years
        </label>
        <div className="age-slider-wrap">
          <input
            type="range"
            min={minAgeUI}
            max={maxAgeUI}
            value={filter.ageRange[0]}
            onChange={(e) =>
              setAgeRange([
                Math.min(Number(e.target.value), filter.ageRange[1] - 1),
                filter.ageRange[1],
              ])
            }
          />
          <input
            type="range"
            min={minAgeUI}
            max={maxAgeUI}
            value={filter.ageRange[1]}
            onChange={(e) =>
              setAgeRange([
                filter.ageRange[0],
                Math.max(Number(e.target.value), filter.ageRange[0] + 1),
              ])
            }
          />
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-label">Total Funding</div>
        <div className="filter-actions">
          <button type="button" onClick={fundingAll}>
            All
          </button>
          <button type="button" onClick={fundingClear}>
            Clear
          </button>
        </div>
        <div className="funding-chips">
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
      </div>
    </div>
  )
}
