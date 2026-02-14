import type { HierarchyLevel } from '../types'

const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  1: 'Categories',
  2: 'Subcategories',
  3: 'Micro-categories',
}

interface PageHeaderProps {
  startupCount: number
  categoryCount: number
  searchActive: boolean
  searchQuery: string
  matchCount: number
  matchCategoryCount: number
  onSearchQueryChange: (q: string) => void
  onSearch: () => void
  onClearSearch: () => void
  onResetDemo: () => void
  onFitToView: () => void
  activeLevel?: HierarchyLevel
}

export function PageHeader({
  startupCount,
  categoryCount,
  searchActive,
  searchQuery,
  matchCount,
  matchCategoryCount,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  onResetDemo,
  onFitToView,
  activeLevel = 2,
}: PageHeaderProps) {
  return (
    <div className={`page-header-wrap ${searchActive ? 'search-active' : ''}`}>
      <div className="page-header">
        <div className="page-header-main">
          <h1 className="page-title">
            {searchActive ? `Search: "${searchQuery}"` : 'Startup Landscape'}
          </h1>
          <div className="page-meta">
            {searchActive ? (
              <span>{matchCount.toLocaleString()} matching startups · {matchCategoryCount} categories</span>
            ) : (
              <>
                <span>{startupCount.toLocaleString()} startups · {categoryCount} categories</span>
                <span className="page-meta-sep">·</span>
                <span>Detail: {LEVEL_LABELS[activeLevel]}</span>
                <span className="page-meta-sep">·</span>
                <span>Updated 2 days ago</span>
              </>
            )}
          </div>
          {searchActive && (
            <p className="page-meta-sub">Showing startups matching your keyword</p>
          )}
          <div className="page-search-row">
            <div className={`search-bar search-bar-large ${searchActive ? 'search-bar-active' : ''}`}>
              <span className="search-icon">⌕</span>
              <input
                type="text"
                placeholder="Search by keyword (e.g. cyber security, defense, AI infrastructure...)"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="search-input"
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm search-btn" onClick={onSearch}>
              Search
            </button>
          </div>
          {searchActive && (
            <div className="active-query-badge">
              <span>Exploring: {searchQuery}</span>
              <button type="button" onClick={onClearSearch} aria-label="Clear search">
                Clear search
              </button>
            </div>
          )}
        </div>
        <div className="page-header-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onResetDemo}>
          Reset Filters
        </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onFitToView}>
            Fit to View
          </button>
          <div className="saved-views">
            <label className="saved-views-label">View:</label>
            <select className="saved-views-select">
              <option>Default</option>
              <option disabled>Early-stage focus</option>
              <option disabled>Enterprise focus</option>
              <option disabled>AI vertical</option>
              <option disabled>My Saved View</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
