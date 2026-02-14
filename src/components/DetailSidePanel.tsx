import { formatFunding } from '../utils/funding'
import { normalizeUrl, isValidLinkUrl } from '../utils/url'
import type { Startup } from '../types'

interface DetailSidePanelProps {
  type: 'startup' | 'category'
  startup?: Startup | null
  categoryName?: string
  startupCount?: number
  totalFunding?: number
  description?: string | null
  searchQuery?: string | null
  categoryMatchCount?: number
  onClose: () => void
}

export function DetailSidePanel({
  type,
  startup,
  categoryName,
  startupCount = 0,
  totalFunding = 0,
  description,
  searchQuery = null,
  categoryMatchCount,
  onClose,
}: DetailSidePanelProps) {
  const isOpen = type === 'startup' ? !!startup : !!categoryName

  if (!isOpen) return null

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h2 className="side-panel-title">
          {type === 'startup' ? startup!.name : categoryName}
        </h2>
        <button type="button" className="side-panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="side-panel-body">
        {searchQuery && (
          <p className="detail-search-context">Matches query: {searchQuery}</p>
        )}
        {type === 'startup' && startup && (
          <ul className="detail-list">
            <li>
              <span className="detail-label">Website</span>
              {isValidLinkUrl(startup.website_url) ? (
                <a href={normalizeUrl(startup.website_url)} target="_blank" rel="noopener noreferrer">
                  {normalizeUrl(startup.website_url)}
                </a>
              ) : (
                <span>{startup.website_url || '—'}</span>
              )}
            </li>
            <li>
              <span className="detail-label">Year Founded</span>
              <span>{startup.year_founded || '—'}</span>
            </li>
            <li>
              <span className="detail-label">Total Funding</span>
              <span>{formatFunding(startup.total_funding >= 0 ? startup.total_funding : 0)}</span>
            </li>
            <li>
              <span className="detail-label">HQ</span>
              <span>{[startup.hq_city, startup.hq_country].filter(Boolean).join(', ') || '—'}</span>
            </li>
            <li>
              <span className="detail-label">Contact</span>
              <span>{startup.contact_person || '—'}</span>
            </li>
            <li>
              <span className="detail-label">Description</span>
              <span>{startup.description || '—'}</span>
            </li>
          </ul>
        )}
        {type === 'category' && (
          <ul className="detail-list">
            {searchQuery && categoryMatchCount !== undefined && (
              <li>
                <span className="detail-label">Matching query</span>
                <span>{categoryMatchCount} startups in this category match your query</span>
              </li>
            )}
            <li>
              <span className="detail-label">Total Startups</span>
              <span>{startupCount}</span>
            </li>
            <li>
              <span className="detail-label">Total Funding</span>
              <span>{formatFunding(totalFunding)}</span>
            </li>
            <li>
              <span className="detail-label">Description</span>
              <span>{description?.trim() || 'No description available.'}</span>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}
