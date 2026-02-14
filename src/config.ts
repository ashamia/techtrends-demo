export const DEFAULT_CATEGORIES_FILE_NAME = 'elbit-categories.csv'
export const DEFAULT_CATEGORIES_PATH = `${import.meta.env.BASE_URL}elbit-categories.csv`

export const ZOOM_L1_TO_L2 = 1.3
export const ZOOM_L2_TO_L1 = 1.1
export const ZOOM_L2_TO_L3 = 2.5
export const ZOOM_L3_TO_L2 = 2.0
export const MIN_LABEL_COUNT = 8
export const MIN_LABEL_COUNT_L2 = 8
export const MIN_LABEL_COUNT_L3 = 3
export const LABEL_MIN_SPACING = 6
export const LABEL_MAX_WIDTH = 140
export const LABEL_LINE_HEIGHT_RATIO = 1.2
export const LABEL_VIEWPORT_MARGIN = 20
export const LABEL_SIDE_CLEARANCE = 20
export const LABEL_CANDIDATE_ANGLES = 12
export const LABEL_LEADER_LINE_COLOR = '#9ca3af'
export const LABEL_LEADER_LINE_STROKE_WIDTH = 1
export const HULL_LEVEL_TRANSITION_MS = 150
export const HULL_EXPANSION = 1.05
export const HULL_MIN_SPACING = 180
export const LABEL_ZOOM_THRESHOLD = 0.3
export const LABEL_UNIFORM_SIZE = true
export const LABEL_FIXED_SCREEN_SIZE = true
export const LABEL_FONT_SIZE = 14
export const LABEL_FONT_SIZE_L1 = 14
export const LABEL_FONT_SIZE_L2 = 13
export const LABEL_FONT_SIZE_L3 = 12
export const LABEL_MIN_WIDTH = 50
export const LABEL_MIN_WIDTH_L1 = 50
export const LABEL_MIN_WIDTH_L2 = 48
export const LABEL_MIN_WIDTH_L3 = 45
export const LABEL_PILL_PADDING_H = 6
export const LABEL_CHAR_WIDTH_RATIO = 0.55
export const LABEL_OFFSET_ABOVE = 25
export const LABEL_OFFSET_L1 = 28
export const LABEL_OFFSET_L2 = 24
export const LABEL_OFFSET_L3 = 20
export const LABEL_MAX_HEIGHT = 32
export const LABEL_MAX_HEIGHT_L1 = 32
export const LABEL_MAX_HEIGHT_L2 = 28
export const LABEL_MAX_HEIGHT_L3 = 26
export const LABEL_PILL_OPACITY = 1
export const LABEL_PILL_BG_COLOR = '#fafafa'
export const LABEL_PILL_BORDER_COLOR = '#e5e7eb'
export const HULL_OPACITY = 0.1
export const HULL_OPACITY_DIMMED = 0.04
export const HULL_OPACITY_PARENT = 0.04
export const HULL_OPACITY_HOVER = 1.15
export const HULL_OPACITY_DIM_CLASS = 0.4
export const GRID_OPACITY = 0.06
export const GRID_RGB = '0,0,0'
export const GRID_SIZE = 40
export const DOT_RADIUS = 3
export const DOT_RADIUS_HOVER = 3
export const DOT_RADIUS_MATCH = 2.5
export const DOT_RADIUS_NON_MATCH = 1.5
export const DOT_RADIUS_L1 = 1.5
export const DOT_RADIUS_L2 = 2
export const DOT_RADIUS_L3 = 2.5
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
