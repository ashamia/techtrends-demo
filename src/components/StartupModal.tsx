import { Modal } from './Modal'
import { formatFunding } from '../utils/funding'
import { normalizeUrl, isValidLinkUrl } from '../utils/url'
import type { Startup } from '../types'

interface StartupModalProps {
  startup: Startup | null
  onClose: () => void
}

export function StartupModal({ startup, onClose }: StartupModalProps) {
  if (!startup) return null

  const urlDisplay = startup.website_url?.trim() || ''
  const normalized = normalizeUrl(urlDisplay)
  const isLink = isValidLinkUrl(urlDisplay)

  return (
    <Modal isOpen={!!startup} onClose={onClose} title={startup.name}>
      <ul className="startup-details">
        <li>
          <span className="label">Website:</span>{' '}
          {isLink ? (
            <a href={normalized} target="_blank" rel="noopener noreferrer">
              {normalized}
            </a>
          ) : (
            <span>{urlDisplay || '—'}</span>
          )}
        </li>
        <li>
          <span className="label">Year Founded:</span> {startup.year_founded || '—'}
        </li>
        <li>
          <span className="label">Total Funding:</span>{' '}
          {formatFunding(startup.total_funding >= 0 ? startup.total_funding : 0)}
        </li>
        <li>
          <span className="label">HQ:</span>{' '}
          {[startup.hq_city, startup.hq_country].filter(Boolean).join(', ') || '—'}
        </li>
        <li>
          <span className="label">Contact:</span> {startup.contact_person || '—'}
        </li>
        <li>
          <span className="label">Description:</span>{' '}
          {startup.description || '—'}
        </li>
      </ul>
    </Modal>
  )
}
