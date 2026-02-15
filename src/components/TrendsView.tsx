import { useState, useCallback } from 'react'
import { VendorModal } from './VendorModal'
import type { Trend, TrendVendor, TrendCategory } from '../types/trends'

const TREND_CATEGORY_OPTIONS: { id: TrendCategory; label: string }[] = [
  { id: 'Emerging Technologies', label: 'Emerging Technologies' },
  { id: 'New Themes', label: 'New Themes' },
  { id: 'Market Phases', label: 'Market Phases' },
]

interface TrendsViewProps {
  trends: Trend[]
  vendorsByTrend: Map<string, TrendVendor[]>
}

export function TrendsView({ trends, vendorsByTrend }: TrendsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<TrendCategory>('Emerging Technologies')
  const [modalTrend, setModalTrend] = useState<Trend | null>(null)

  const filteredTrends = trends.filter((t) => t.category === selectedCategory)
  const modalVendors = modalTrend ? (vendorsByTrend.get(modalTrend.id) ?? []) : []

  const handleCardClick = useCallback((trend: Trend) => {
    setModalTrend(trend)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalTrend(null)
  }, [])

  return (
    <div className="trends-layout">
      <aside className="trends-sidebar">
        {TREND_CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`trends-sidebar-btn ${selectedCategory === opt.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </aside>
      <main className="trends-main">
        <div className="trends-cards">
          {filteredTrends.map((trend) => (
            <button
              key={trend.id}
              type="button"
              className="trend-card"
              onClick={() => handleCardClick(trend)}
            >
              <h3 className="trend-card-title">{trend.name}</h3>
              <p className="trend-card-date">{trend.detectionDate}</p>
              <p className="trend-card-desc">{trend.description}</p>
            </button>
          ))}
        </div>
        {filteredTrends.length === 0 && (
          <p className="trends-empty">No trends in this category.</p>
        )}
      </main>
      <VendorModal
        isOpen={modalTrend !== null}
        onClose={handleCloseModal}
        trendName={modalTrend?.name ?? ''}
        vendors={modalVendors}
      />
    </div>
  )
}
