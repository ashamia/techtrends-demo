function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const PALETTE_RAW = [
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

function desaturate(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  const r2 = r + (lum - r) * amount
  const g2 = g + (lum - g) * amount
  const b2 = b + (lum - b) * amount
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`
}

const PALETTE = PALETTE_RAW.map((c) => desaturate(c, 0.12))

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
