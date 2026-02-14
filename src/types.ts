export interface Startup {
  id: string
  name: string
  website_url: string
  x: number
  y: number
  category_id: string
  category_name: string
  year_founded: number
  total_funding: number
  hq_country: string
  hq_city: string
  contact_person: string
  description: string
  user_group: string
  level1_id?: string
  level2_id?: string
  level3_id?: string
}

export interface Category {
  category_id: string
  category_name: string
  category_description: string
  parent_category_id?: string
  level?: 1 | 2 | 3
}

export type HierarchyLevel = 1 | 2 | 3

export interface HullPolygon {
  categoryId: string
  points: [number, number][]
  centroid: [number, number]
}

export interface ValidationError {
  type: 'missing_columns' | 'parse_error'
  message: string
}

export interface FilterState {
  userGroups: Set<string>
  ageRange: [number, number]
  fundingBuckets: Set<string>
}
