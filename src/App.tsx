import { useState, useEffect, useCallback } from 'react'
import { zoomIdentity } from 'd3-zoom'
import type { ZoomTransform } from 'd3-zoom'
import { parseStartupsCsv, parseCategoriesCsv, validateStartupsColumns, validateCategoriesColumns } from './data/parse'
import { useFilteredStartups, computeAgeBounds } from './hooks/useFilteredData'
import { ProductHeader } from './components/ProductHeader'
import { PageHeader } from './components/PageHeader'
import { MetricsPanel } from './components/MetricsPanel'
import { FiltersPanel } from './components/FiltersPanel'
import { MapView } from './components/MapView'
import { DetailSidePanel } from './components/DetailSidePanel'
import { UploadModal } from './components/UploadModal'
import type { Startup, Category, FilterState } from './types'
import { MAX_STARTUPS, PADDING_PERCENT } from './config'
import { FUNDING_BUCKETS } from './config'

const DEMO_STARTUPS = '/demo-startups.csv'
const DEMO_CATEGORIES = '/demo-categories.csv'

function computeBounds(startups: Startup[]) {
  if (startups.length === 0) {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100 }
  }
  const xs = startups.map((s) => s.x)
  const ys = startups.map((s) => s.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const padX = (maxX - minX) * PADDING_PERCENT || 10
  const padY = (maxY - minY) * PADDING_PERCENT || 10
  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  }
}

function fitTransform(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  width: number,
  height: number
): ZoomTransform {
  const w = bounds.maxX - bounds.minX
  const h = bounds.maxY - bounds.minY
  const k = Math.min(width / w, height / h, 2)
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const x = width / 2 - k * cx
  const y = height / 2 - k * cy
  return zoomIdentity.translate(x, y).scale(k)
}

function buildInitialFilter(startups: Startup[]): FilterState {
  const userGroups = new Set(startups.map((s) => s.user_group).filter(Boolean))
  const [minAge, maxAge] = computeAgeBounds(startups)
  const fundingBuckets = new Set(FUNDING_BUCKETS.map((b) => b.id))
  return {
    userGroups,
    ageRange: [minAge, maxAge],
    fundingBuckets,
  }
}

export default function App() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterState | null>(null)
  const [transform, setTransform] = useState<ZoomTransform | null>(null)
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string
    name: string
    count: number
    funding: number
    description: string | null
  } | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [mapSize, setMapSize] = useState({ width: 800, height: 600 })

  const filteredStartups = useFilteredStartups(startups, filter ?? ({} as FilterState))
  const bounds = computeBounds(filteredStartups)

  const loadData = useCallback(async (startupsData: Startup[], categoriesData: Category[]) => {
    setStartups(startupsData)
    setCategories(categoriesData)
    setFilter(buildInitialFilter(startupsData))
    setError(null)
  }, [])

  const loadDemo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [startupsRes, categoriesRes] = await Promise.all([
        fetch(DEMO_STARTUPS),
        fetch(DEMO_CATEGORIES),
      ])
      if (!startupsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to load demo data.')
      }
      const [startupsText, categoriesText] = await Promise.all([
        startupsRes.text(),
        categoriesRes.text(),
      ])
      if (!validateStartupsColumns(startupsText)) {
        setError('Startups CSV is missing required columns.')
        setLoading(false)
        return
      }
      if (!validateCategoriesColumns(categoriesText)) {
        setError('Categories CSV is missing required columns.')
        setLoading(false)
        return
      }
      const startupsData = parseStartupsCsv(startupsText)
      const categoriesData = parseCategoriesCsv(categoriesText)
      await loadData(startupsData, categoriesData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [loadData])

  useEffect(() => {
    loadDemo()
  }, [loadDemo])

  useEffect(() => {
    const el = document.getElementById('map-wrapper')
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) setMapSize({ width: w, height: h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!filter) return
    const el = document.getElementById('map-wrapper')
    const w = el?.clientWidth ?? 800
    const h = el?.clientHeight ?? 600
    setMapSize({ width: w, height: h })
    if (!transform) {
      setTransform(fitTransform(bounds, w, h))
    }
  }, [filter, bounds, transform])

  const handleFitToView = useCallback(() => {
    const el = document.getElementById('map-wrapper')
    const w = el?.clientWidth ?? 800
    const h = el?.clientHeight ?? 600
    setMapSize({ width: w, height: h })
    setTransform(fitTransform(bounds, w, h))
  }, [bounds])

  const handleUploadLoad = useCallback(
    (startupsData: Startup[], categoriesData: Category[]) => {
      loadData(startupsData, categoriesData)
      setFilter(buildInitialFilter(startupsData))
      setTransform(null)
    },
    [loadData]
  )

  const handleCategoryClick = useCallback(
    (categoryId: string, categoryName: string) => {
      const inCategory = filteredStartups.filter((s) => s.category_id === categoryId)
      const totalFunding = inCategory.reduce((sum, s) => sum + (s.total_funding >= 0 ? s.total_funding : 0), 0)
      const cat = categories.find((c) => c.category_id === categoryId)
      setSelectedStartup(null)
      setSelectedCategory({
        id: categoryId,
        name: categoryName,
        count: inCategory.length,
        funding: totalFunding,
        description: cat?.category_description?.trim() || null,
      })
    },
    [filteredStartups, categories]
  )

  const handleStartupClick = useCallback((startup: Startup) => {
    setSelectedCategory(null)
    setSelectedStartup(startup)
  }, [])

  const warnStartups = startups.length > MAX_STARTUPS

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading…</div>
      </div>
    )
  }

  if (error && startups.length === 0) {
    return (
      <div className="app">
        <div className="error">{error}</div>
        <button type="button" onClick={loadDemo}>
          Retry
        </button>
      </div>
    )
  }

  if (startups.length === 0) {
    return (
      <div className="app">
        <div className="error">No data to display.</div>
      </div>
    )
  }

  return (
    <div className="app">
      <ProductHeader onUploadClick={() => setUploadOpen(true)} />
      {warnStartups && (
        <div className="warning-banner">
          Dataset exceeds {MAX_STARTUPS} startups. Performance may be affected.
        </div>
      )}
      <div className="page-header-wrap">
        <PageHeader
          startupCount={filteredStartups.length}
          categoryCount={new Set(filteredStartups.map((s) => s.category_id)).size}
          onResetDemo={loadDemo}
          onFitToView={handleFitToView}
        />
      </div>
      <div className="main">
        <aside className="sidebar">
          <FiltersPanel
            startups={startups}
            filter={filter!}
            onFilterChange={setFilter}
            onResetAll={() => setFilter(buildInitialFilter(startups))}
          />
        </aside>
        <div className="content-area">
          <div className="metrics-wrap">
            <MetricsPanel />
          </div>
          <div id="map-wrapper" className="map-wrapper">
            {transform && (
              <MapView
                startups={filteredStartups}
                width={mapSize.width}
                height={mapSize.height}
                bounds={bounds}
                transform={transform}
                onTransformChange={setTransform}
                onStartupClick={handleStartupClick}
                onCategoryClick={handleCategoryClick}
                hoveredId={hoveredId}
                selectedId={selectedStartup?.id ?? null}
                onHoverChange={setHoveredId}
              />
            )}
            {filteredStartups.length === 0 && (
              <div className="empty-state">
                No startups match current filters.
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFilter(buildInitialFilter(startups))}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
        <DetailSidePanel
          type={selectedStartup ? 'startup' : 'category'}
          startup={selectedStartup}
          categoryName={selectedCategory?.name}
          startupCount={selectedCategory?.count ?? 0}
          totalFunding={selectedCategory?.funding ?? 0}
          description={selectedCategory?.description ?? null}
          onClose={() => {
            setSelectedStartup(null)
            setSelectedCategory(null)
          }}
        />
      </div>
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onLoad={handleUploadLoad}
      />
    </div>
  )
}
