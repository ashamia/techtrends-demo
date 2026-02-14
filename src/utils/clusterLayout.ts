import type { Startup } from '../types'
import { HULL_MIN_SPACING } from '../config'

interface Cluster {
  categoryId: string
  centroid: [number, number]
  startups: Startup[]
}

function getClusterCentroid(startups: Startup[]): [number, number] {
  if (startups.length === 0) return [0, 0]
  const sumX = startups.reduce((s, p) => s + p.x, 0)
  const sumY = startups.reduce((s, p) => s + p.y, 0)
  return [sumX / startups.length, sumY / startups.length]
}

export function applyClusterLayout(
  startups: Startup[],
  minSpacing?: number
): Startup[] {
  const spacing = minSpacing ?? HULL_MIN_SPACING
  const byCategory = new Map<string, Startup[]>()
  for (const s of startups) {
    const list = byCategory.get(s.category_id) ?? []
    list.push(s)
    byCategory.set(s.category_id, list)
  }

  const clusters: Cluster[] = []
  for (const [categoryId, list] of byCategory) {
    if (list.length === 0) continue
    clusters.push({
      categoryId,
      centroid: getClusterCentroid(list),
      startups: list,
    })
  }

  const offsets = new Map<string, { x: number; y: number }>()
  for (const c of clusters) {
    offsets.set(c.categoryId, { x: 0, y: 0 })
  }

  const iterations = 80
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a = clusters[i]
        const b = clusters[j]
        const offA = offsets.get(a.categoryId)!
        const offB = offsets.get(b.categoryId)!
        const ax = a.centroid[0] + offA.x
        const ay = a.centroid[1] + offA.y
        const bx = b.centroid[0] + offB.x
        const by = b.centroid[1] + offB.y
        const dx = bx - ax
        const dy = by - ay
        const dist = Math.hypot(dx, dy)
        if (dist < spacing && dist > 0.001) {
          const push = (spacing - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          offsets.set(a.categoryId, { x: offA.x - nx * push, y: offA.y - ny * push })
          offsets.set(b.categoryId, { x: offB.x + nx * push, y: offB.y + ny * push })
          moved = true
        }
      }
    }
    if (!moved) break
  }

  return startups.map((s) => {
    const off = offsets.get(s.category_id)
    if (!off || (off.x === 0 && off.y === 0)) return s
    return { ...s, x: s.x + off.x, y: s.y + off.y }
  })
}
