# Tech Trends – Startup Landscape

Interactive 2D visualization of startups clustered by market category. Built with React, TypeScript, Vite, and D3.

## Requirements

- Node.js 18+ (Vite 5 requires Node 18)
- npm 8+

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Features

- **Map view**: Startups as dots, categories as convex hull "islands"
- **Zoom & pan**: Mouse wheel and drag
- **Click startup**: Opens modal with details
- **Click category**: Opens modal with aggregate stats
- **Filters**: User group, age, total funding
- **Data loading**: Default demo CSV or upload custom data

## Data Format

See `docs/specs.md` for full CSV schema. Required files:

- `demo-startups.csv` – startup records (id, name, x, y, category_id, etc.)
- `demo-categories.csv` – **category names and descriptions** (edit this file to change cluster labels and side-panel descriptions)

The categories file (`public/demo-categories.csv`) is the source of truth for cluster names and descriptions. Edit it directly when you need to update labels or category descriptions; changes apply after reloading the app.
