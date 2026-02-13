export const HULL_EXPANSION = 1.05
export const HULL_MIN_SPACING = 180
export const LABEL_ZOOM_THRESHOLD = 0.3
export const LABEL_FONT_SIZE = 17
export const LABEL_MIN_WIDTH = 80
export const LABEL_PILL_PADDING_H = 12
export const LABEL_CHAR_WIDTH_RATIO = 0.55
export const LABEL_OFFSET_ABOVE = 25
export const LABEL_MAX_HEIGHT = 48
export const LABEL_PILL_OPACITY = 1
export const LABEL_PILL_BG_COLOR = '#fafafa'
export const LABEL_PILL_BORDER_COLOR = '#e5e7eb'
export const HULL_OPACITY = 0.1
export const HULL_OPACITY_DIMMED = 0.04
export const HULL_OPACITY_HOVER = 1.15
export const HULL_OPACITY_DIM_CLASS = 0.4
export const GRID_OPACITY = 0.06
export const GRID_RGB = '0,0,0'
export const GRID_SIZE = 40
export const DOT_RADIUS = 6
export const DOT_RADIUS_HOVER = 6
export const DOT_RADIUS_MATCH = 5
export const DOT_RADIUS_NON_MATCH = 3
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
