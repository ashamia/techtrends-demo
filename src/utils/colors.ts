function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const PALETTE = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
  '#393b79', '#637939', '#8ca252', '#b5cf6b', '#cedb9c',
  '#8c6d31', '#bd9e39', '#e7ba52', '#e7969c', '#7b4173',
  '#a55194', '#ce6dbd', '#de9ed6', '#5254a3', '#6b6ecf',
  '#9c9ede', '#637939', '#8ca252', '#b5cf6b', '#cedb9c',
  '#8c6d31', '#bd9e39', '#e7ba52', '#e7969c', '#7b4173',
  '#a55194', '#ce6dbd', '#de9ed6', '#5254a3', '#6b6ecf',
]

export function getCategoryColor(categoryId: string): string {
  const idx = hashString(categoryId) % PALETTE.length
  return PALETTE[idx]
}

export function buildColorScale(categoryIds: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const id of categoryIds) {
    map.set(id, getCategoryColor(id))
  }
  return map
}
