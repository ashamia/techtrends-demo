export function normalizeUrl(raw: string): string {
  const s = String(raw).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

export function isValidLinkUrl(raw: string): boolean {
  const s = normalizeUrl(raw)
  if (!s) return false
  try {
    const u = new URL(s)
    const host = u.hostname || ''
    return host.includes('.')
  } catch {
    return false
  }
}
