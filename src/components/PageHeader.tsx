interface PageHeaderProps {
  startupCount: number
  categoryCount: number
  onResetDemo: () => void
  onFitToView: () => void
}

export function PageHeader({ startupCount, categoryCount, onResetDemo, onFitToView }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        <h1 className="page-title">Startup Landscape</h1>
        <div className="page-meta">
          <span>{startupCount.toLocaleString()} startups · {categoryCount} categories</span>
          <span className="page-meta-sep">·</span>
          <span>Updated 2 days ago</span>
          <span className="page-meta-sep">·</span>
          <span>Data source: Internal crawler</span>
        </div>
        <div className="page-search-row">
          <div className="search-bar search-bar-large">
            <span className="search-icon">⌕</span>
            <input type="text" placeholder="search keywords" readOnly className="search-input" />
          </div>
          <button type="button" className="btn btn-primary btn-sm search-btn">
            Search
          </button>
        </div>
      </div>
      <div className="page-header-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onResetDemo}>
          Reset Demo
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
  )
}
