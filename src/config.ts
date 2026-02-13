export const HULL_EXPANSION = 1.15
export const LABEL_ZOOM_THRESHOLD = 0.8
export const DOT_RADIUS = 4
export const DOT_RADIUS_HOVER = 5
export const MAX_STARTUPS = 2000
export const PADDING_PERCENT = 0.1
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 20
export const MIN_AGE_SPAN = 10
export const AGE_MAX_CAP = 60

export const FUNDING_BUCKETS = [
  { id: '0-5M', label: '0–$5M', min: 0, max: 5_000_000 },
  { id: '5-20M', label: '$5–$20M', min: 5_000_000, max: 20_000_000 },
  { id: '20-100M', label: '$20–$100M', min: 20_000_000, max: 100_000_000 },
  { id: '100M+', label: '$100M+', min: 100_000_000, max: Infinity },
] as const
