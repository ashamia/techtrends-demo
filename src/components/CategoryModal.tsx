import { Modal } from './Modal'
import { formatFunding } from '../utils/funding'

interface CategoryModalProps {
  categoryName: string
  startupCount: number
  totalFunding: number
  description: string | null
  onClose: () => void
}

export function CategoryModal({
  categoryName,
  startupCount,
  totalFunding,
  description,
  onClose,
}: CategoryModalProps) {
  return (
    <Modal isOpen={!!categoryName} onClose={onClose} title={categoryName}>
      <ul className="category-details">
        <li>
          <span className="label">Total Startups:</span> {startupCount}
        </li>
        <li>
          <span className="label">Total Funding:</span> {formatFunding(totalFunding)}
        </li>
        <li>
          <span className="label">Description:</span>{' '}
          {description?.trim() || 'No description available.'}
        </li>
      </ul>
    </Modal>
  )
}
