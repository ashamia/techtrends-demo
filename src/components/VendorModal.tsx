import { Modal } from './Modal'
import type { TrendVendor } from '../types/trends'

function formatFunding(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n}`
}

interface VendorModalProps {
  isOpen: boolean
  onClose: () => void
  trendName: string
  vendors: TrendVendor[]
}

export function VendorModal({ isOpen, onClose, trendName, vendors }: VendorModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={trendName} contentClassName="modal-content-wide">
      <div className="vendor-table-wrap">
        <table className="vendor-table">
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Year Founded</th>
              <th>Funding to-date</th>
              <th>HQ Location</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, i) => (
              <tr key={`${v.trendId}-${v.vendorName}-${i}`}>
                <td>{v.vendorName}</td>
                <td>{v.yearFounded || '-'}</td>
                <td>{formatFunding(v.fundingToDate)}</td>
                <td>{v.hqLocation}</td>
                <td>
                  {v.url ? (
                    <a href={v.url} target="_blank" rel="noopener noreferrer">
                      {v.url}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vendors.length === 0 && (
          <p className="vendor-table-empty">No vendors in this trend.</p>
        )}
      </div>
    </Modal>
  )
}
