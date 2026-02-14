/**
 * Converts a hierarchical categories JSON file to a flat CSV for the startup landscape.
 * Output supports zoom-level hierarchy visualization (parent_category_id, level).
 *
 * Usage: node scripts/json-to-categories-csv.cjs <path-to-json>
 * Example: node scripts/json-to-categories-csv.cjs public/json/elbit-categories.json
 *
 * Output: public/<basename>.csv (e.g., public/elbit-categories.csv)
 */

const fs = require('fs')
const path = require('path')

function escapeCsvField(value) {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function walk(node, parentId, rows) {
  const categoryId = node.category_id ?? ''
  const categoryName = node.category_name ?? ''
  const categoryDescription = node.category_description ?? ''
  const level = node.level ?? 1
  rows.push({
    category_id: categoryId,
    category_name: categoryName,
    category_description: categoryDescription,
    parent_category_id: parentId ?? '',
    level,
  })
  const children = node.children ?? []
  for (const child of children) {
    walk(child, categoryId, rows)
  }
}

function jsonToCsv(jsonPath) {
  const resolved = path.resolve(jsonPath)
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`)
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(resolved, 'utf8'))
  const nodes = data.nodes ?? (Array.isArray(data) ? data : [data])
  if (!Array.isArray(nodes)) {
    console.error('JSON must have a "nodes" array or be an array of nodes')
    process.exit(1)
  }

  const rows = []
  for (const node of nodes) {
    walk(node, null, rows)
  }

  const header = 'category_id,category_name,category_description,parent_category_id,level'
  const lines = [
    header,
    ...rows.map((r) =>
      [
        escapeCsvField(r.category_id),
        escapeCsvField(r.category_name),
        escapeCsvField(r.category_description),
        escapeCsvField(r.parent_category_id),
        escapeCsvField(r.level),
      ].join(',')
    ),
  ]

  const basename = path.basename(jsonPath, '.json')
  const outDir = path.resolve(path.dirname(jsonPath), '..')
  const outPath = path.join(outDir, `${basename}.csv`)
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
  console.log(`Wrote ${rows.length} categories to ${outPath}`)
}

const jsonPath = process.argv[2]
if (!jsonPath) {
  console.error('Usage: node scripts/json-to-categories-csv.cjs <path-to-json>')
  console.error('Example: node scripts/json-to-categories-csv.cjs public/json/elbit-categories.json')
  process.exit(1)
}

jsonToCsv(jsonPath)
