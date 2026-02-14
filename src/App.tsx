import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { zoomIdentity } from 'd3-zoom'
import type { ZoomTransform } from 'd3-zoom'
import { parseStartupsCsv, parseCategoriesCsv, applyCategoriesToStartups, validateStartupsColumns, validateCategoriesColumns } from './data/parse'
import { useFilteredStartups, computeAgeBounds } from './hooks/useFilteredData'
import { matchStartups, getCategoryMatchCounts } from './utils/search'
import { applyClusterLayout } from './utils/clusterLayout'
import { getHierarchyLevel } from './utils/hierarchy'
import type { HierarchyLevel } from './types'
import { ProductHeader } from './components/ProductHeader'
import { PageHeader } from './components/PageHeader'
import { MetricsPanel } from './components/MetricsPanel'
import { FiltersPanel } from './components/FiltersPanel'
import { MapView } from './components/MapView'
import { DetailSidePanel } from './components/DetailSidePanel'
import { UploadModal } from './components/UploadModal'
import type { Startup, Category, FilterState } from './types'
import { MAX_STARTUPS, PADDING_PERCENT, GRID_OPACITY, GRID_RGB, GRID_SIZE, HULL_OPACITY_HOVER, HULL_OPACITY_DIM_CLASS, DEFAULT_CATEGORIES_PATH } from './config'
import { FUNDING_BUCKETS } from './config'

const appStyle = {
  '--grid-opacity': GRID_OPACITY,
  '--grid-rgb': GRID_RGB,
  '--grid-size': `${GRID_SIZE}px`,
  '--hull-opacity-hover': HULL_OPACITY_HOVER,
  '--hull-opacity-dimmed': HULL_OPACITY_DIM_CLASS,
} as React.CSSProperties

const DEMO_STARTUPS = '/demo-startups.csv'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedSearch, setAppliedSearch] = useState<string | null>(null)

  const filteredStartups = useFilteredStartups(startups, filter ?? ({} as FilterState))
  const searchActive = appliedSearch !== null && appliedSearch.trim().length > 0

  const { matches: matchingStartups, matchInfo } = searchActive
    ? matchStartups(filteredStartups, appliedSearch!)
    : { matches: filteredStartups, matchInfo: new Map() }

  const matchIds = new Set(matchingStartups.map((s) => s.id))

  const hierarchyRef = useRef<{ level: HierarchyLevel; k: number }>({ level: 1, k: 0 })
  const activeLevel: HierarchyLevel = useMemo(() => {
    if (!transform) return 1
    const prev = hierarchyRef.current
    const zoomingIn = transform.k > prev.k
    const next = getHierarchyLevel(transform.k, prev.level, zoomingIn)
    hierarchyRef.current = { level: next, k: transform.k }
    return next
  }, [transform])

  const categoryMatchCounts = searchActive ? getCategoryMatchCounts(filteredStartups, matchIds, activeLevel) : new Map<string, number>()

  const layoutStartups = useMemo(
    () => applyClusterLayout(filteredStartups),
    [filteredStartups]
  )
  const bounds = computeBounds(layoutStartups)

  const startupsRef = useRef(startups)
  const categoriesRef = useRef(categories)
  useEffect(() => {
    startupsRef.current = startups
    categoriesRef.current = categories
  }, [startups, categories])

  const loadData = useCallback(async (startupsData: Startup[], categoriesData: Category[]) => {
    applyCategoriesToStartups(startupsData, categoriesData)
    setStartups(startupsData)
    setCategories(categoriesData)
    setFilter(buildInitialFilter(startupsData))
    setAppliedSearch(null)
    setSearchQuery('')
    setError(null)
  }, [])

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim()
    setAppliedSearch(q || null)
  }, [searchQuery])

  const handleClearSearch = useCallback(() => {
    setAppliedSearch(null)
    setSearchQuery('')
  }, [])

  const loadDemo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [startupsRes, categoriesRes] = await Promise.all([
        fetch(DEMO_STARTUPS),
        fetch(DEFAULT_CATEGORIES_PATH),
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
    (startupsData?: Startup[], categoriesData?: Category[]) => {
      const currentStartups = startupsRef.current
      const currentCategories = categoriesRef.current
      const nextStartups = startupsData ?? currentStartups.map((s) => ({ ...s }))
      let nextCategories: Category[]
      if (categoriesData) {
        if (startupsData) {
          nextCategories = categoriesData
        } else {
          const byId = new Map<string, Category>()
          const result: Category[] = []
          const addWithAlias = (c: Category) => {
            if (byId.has(c.category_id)) return
            byId.set(c.category_id, c)
            result.push(c)
            const m = c.category_id.match(/^cat-(\d+)$/)
            if (m) {
              const altId = `cat${m[1]}`
              if (!byId.has(altId)) {
                const alias = { ...c, category_id: altId }
                byId.set(altId, alias)
                result.push(alias)
              }
            }
            const m2 = c.category_id.match(/^cat(\d+)$/)
            if (m2) {
              const altId = `cat-${m2[1]}`
              if (!byId.has(altId)) {
                const alias = { ...c, category_id: altId }
                byId.set(altId, alias)
                result.push(alias)
              }
            }
          }
          for (const c of categoriesData) {
            addWithAlias(c)
          }
          for (const c of currentCategories) {
            if (!byId.has(c.category_id)) {
              addWithAlias(c)
            }
          }
          nextCategories = result
        }
      } else {
        nextCategories = currentCategories
      }
      applyCategoriesToStartups(nextStartups, nextCategories)
      setStartups([...nextStartups])
      setCategories([...nextCategories])
      setFilter(buildInitialFilter(nextStartups))
      setAppliedSearch(null)
      setSearchQuery('')
      setTransform(null)
    },
    []
  )

  const handleCategoryClick = useCallback(
    (categoryId: string, categoryName: string) => {
      const getGroupId = (s: Startup) => {
        if (activeLevel === 1 && s.level1_id) return s.level1_id
        if (activeLevel === 2 && s.level2_id) return s.level2_id
        if (activeLevel === 3 && s.level3_id) return s.level3_id
        return s.category_id
      }
      const inCategory = filteredStartups.filter((s) => getGroupId(s) === categoryId)
      const totalFunding = inCategory.reduce((sum, s) => sum + (s.total_funding >= 0 ? s.total_funding : 0), 0)
      const cat = categories.find((c) => c.category_id === categoryId)
      const matchCount = searchActive ? (categoryMatchCounts.get(categoryId) ?? 0) : inCategory.length
      setSelectedStartup(null)
      setSelectedCategory({
        id: categoryId,
        name: categoryName,
        count: searchActive ? matchCount : inCategory.length,
        funding: totalFunding,
        description: cat?.category_description?.trim() || null,
      })
    },
    [filteredStartups, categories, searchActive, categoryMatchCounts, activeLevel]
  )

  const handleStartupClick = useCallback((startup: Startup) => {
    setSelectedCategory(null)
    setSelectedStartup(startup)
  }, [])

  const warnStartups = startups.length > MAX_STARTUPS

  if (loading) {
    return (
      <div className="app" style={appStyle}>
        <div className="loading">Loading…</div>
      </div>
    )
  }

  if (error && startups.length === 0) {
    return (
      <div className="app" style={appStyle}>
        <div className="error">{error}</div>
        <button type="button" onClick={loadDemo}>
          Retry
        </button>
      </div>
    )
  }

  if (startups.length === 0) {
    return (
      <div className="app" style={appStyle}>
        <div className="error">No data to display.</div>
      </div>
    )
  }

  return (
    <div className="app" style={appStyle}>
      <ProductHeader onUploadClick={() => setUploadOpen(true)} />
      {warnStartups && (
        <div className="warning-banner">
          Dataset exceeds {MAX_STARTUPS} startups. Performance may be affected.
        </div>
      )}
      <PageHeader
        startupCount={filteredStartups.length}
        categoryCount={new Set(filteredStartups.map((s) => s.category_id)).size}
        searchActive={searchActive}
        searchQuery={searchQuery}
        matchCount={matchingStartups.length}
        matchCategoryCount={new Set(matchingStartups.map((s) => s.category_id)).size}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onResetDemo={loadDemo}
        onFitToView={handleFitToView}
        activeLevel={activeLevel}
      />
      <div className="main">
        <aside className="sidebar">
          <FiltersPanel
            startups={startups}
            filter={filter!}
            onFilterChange={setFilter}
            onResetAll={() => setFilter(buildInitialFilter(startups))}
          />
        </aside>
        <div className={`content-area ${searchActive ? 'search-active' : ''}`}>
          <div className="metrics-wrap">
            <MetricsPanel
              searchActive={searchActive}
              startups={filteredStartups}
              matchingStartups={matchingStartups}
            />
          </div>
          {searchActive && matchingStartups.length <= 30 && (
            <div className="narrow-query-message">
              {matchingStartups.length === 0 ? (
                <>No startups match "{appliedSearch}"</>
              ) : (
                <>
                  {matchingStartups.length} startup{matchingStartups.length !== 1 ? 's' : ''} match "{appliedSearch}"
                  {(() => {
                    const topCats = [...categoryMatchCounts.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 2)
                    const catNames = topCats.map(([id]) => {
                      const s = filteredStartups.find((x) => x.category_id === id)
                      return s?.category_name ?? id
                    })
                    return catNames.length > 0 ? ` — Primarily in ${catNames.join(' and ')}` : ''
                  })()}
                </>
              )}
            </div>
          )}
          <div id="map-wrapper" className="map-wrapper">
            {transform && (
              <MapView
                startups={layoutStartups}
                categories={categories}
                width={mapSize.width}
                height={mapSize.height}
                bounds={bounds}
                transform={transform}
                activeLevel={activeLevel}
                onTransformChange={setTransform}
                onStartupClick={handleStartupClick}
                onCategoryClick={handleCategoryClick}
                hoveredId={hoveredId}
                selectedId={selectedStartup?.id ?? null}
                onHoverChange={setHoveredId}
                searchActive={searchActive}
                matchIds={matchIds}
                matchInfo={matchInfo}
                categoryMatchCounts={categoryMatchCounts}
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
          searchQuery={searchActive ? appliedSearch : null}
          categoryMatchCount={selectedCategory && searchActive
            ? (categoryMatchCounts.get(selectedCategory.id) ?? 0)
            : undefined}
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
