export type TrendCategory = 'Emerging Technologies' | 'New Themes' | 'Market Phases'

export interface Trend {
  id: string
  name: string
  detectionDate: string
  description: string
  category: TrendCategory
}

export interface TrendVendor {
  trendId: string
  vendorName: string
  yearFounded: number
  fundingToDate: number
  hqLocation: string
  url: string
}
