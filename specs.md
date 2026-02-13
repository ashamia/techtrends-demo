Below is the fully updated, consolidated specification incorporating all recent decisions and clarifications.

This version replaces the previous spec entirely and can serve as the authoritative docs/specs.md.

⸻

Tech Trends Demo Frontend

Interactive Startup Landscape – Final MVP Specification

⸻

1. Objective

Build a front-end-only interactive visualization that displays startups as dots in a 2D landscape.
	•	Each dot = one startup
	•	Each island = one market category
	•	Clickable startups and categories
	•	Filtering by:
	•	User Group
	•	Age
	•	Total Funding

Scale limits:
	•	Max 2,000 startups
	•	Max 50 categories

No backend required.
Data provided via CSV files.

Deployable as static site (e.g., DigitalOcean).

⸻

2. Tech Stack

Core Framework
	•	React + TypeScript
	•	Vite (build tool)

Visualization
	•	Canvas → startup dots
	•	SVG overlay → cluster hulls + cluster labels
	•	D3 modules:
	•	d3-dsv (CSV parsing)
	•	d3-zoom (pan/zoom)
	•	d3-quadtree (hit detection)
	•	d3-scale (color mapping)
	•	d3-array (grouping/aggregation)
	•	d3-polygon (convex hull)
	•	d3-shape (smooth hull rendering)

UI / Modals
	•	Custom React modal component
	•	Single modal open at any time

⸻

3. Data Specification

Two CSV files are required.

⸻

3.1 startups.csv (Required)

Each row represents one startup.

Required Columns

Column	Type	Description
id	string	Unique startup ID
name	string	Startup name
website_url	string	Website URL
x	number	Precomputed X coordinate
y	number	Precomputed Y coordinate
category_id	string/int	Cluster identifier
category_name	string	Market category name
year_founded	number	Year founded
total_funding	number	Total funding (USD)
hq_country	string	HQ country
hq_city	string	HQ city
contact_person	string	Contact name
description	string	~3 sentence description
user_group	string	User group classification


⸻

3.2 categories.csv (Required)

Each row represents one category.

Column	Type	Description
category_id	string/int	Must match startups.csv
category_name	string	Category name
category_description	string	~6 sentence description

If category_description is missing:
	•	Display: “No description available.”

If category_name differs between files:
	•	Display name from startups.csv
	•	Use categories.csv only for description

⸻

4. Data Loading

Default Load

On page load:
	•	Automatically fetch:
	•	/public/demo-startups.csv
	•	/public/demo-categories.csv

Upload Override

Single flow:
	•	Button: Upload Custom Data
	•	Opens modal requiring:
	•	startups.csv (required)
	•	categories.csv (required)
	•	Load button enabled only when both files are selected and pass validation
	•	Replaces in-memory dataset
	•	Recomputes:
	•	Bounds
	•	Hulls
	•	Filters
	•	Quadtree
	•	Auto “fit to view”

Reset
	•	Button: Reset to Demo Data
	•	Reloads bundled demo files

Validation Rules
	•	Missing required columns → blocking error
	•	2000 startups → warning banner (still render)
	•	50 categories → warning banner (still render)

⸻

5. Coordinate Handling

Coordinates are arbitrary numeric values.

On load or dataset change:
	1.	Compute bounding box
	2.	Add 10% padding
	3.	Auto-fit to viewport
	4.	Initialize zoom transform

Include Fit to View button to reset view.

⸻

6. Rendering Architecture

Layer order:
	1.	Background
	2.	Cluster hulls (SVG)
	3.	Startup dots (Canvas)
	4.	Cluster labels (SVG)
	5.	Modal overlay

⸻

7. Startup Dots
	•	Radius: 4px
	•	Hover: radius 5px + subtle outline
	•	Click: highlighted ring
	•	Color: deterministic mapping from category_id

No random color generation.

⸻

8. Cluster Hull Generation

For each category_id:
	1.	Collect visible startups
	2.	If ≥ 3 startups:
	•	Compute convex hull via d3.polygonHull
	•	Compute centroid
	•	Expand hull:

p' = C + (p - C) * 1.15

	3.	Render smoothed path via d3.curveCatmullRomClosed

Styling:
	•	Fill: rgba(0,0,0,0.05)
	•	No stroke

Constant:

HULL_EXPANSION = 1.15

Clusters < 3 startups:
	•	No hull rendered

⸻

9. Cluster Labels
	•	Positioned at cluster centroid
	•	White pill background
	•	Clickable
	•	Hidden when zoom < 0.8 (configurable constant)

⸻

10. Interactions

⸻

10.1 Zoom & Pan
	•	Mouse wheel zoom
	•	Drag to pan
	•	Min zoom: 0.5x
	•	Max zoom: 20x
	•	Use d3-zoom

⸻

10.2 Startup Click → Modal

Centered modal.

Content

Title (large, bold):
Startup Name

Below:
	•	Website URL
	•	Year Founded
	•	Total Funding (formatted, e.g. $42.3M)
	•	HQ: City, Country
	•	Contact Person
	•	Description (~3 sentences)

Website URL Handling
	•	If no scheme, prepend https:// for linking
	•	Link only if:
	•	Valid URL parse
	•	Hostname contains at least one dot
	•	If invalid:
	•	Show as plain text
	•	Always display field

Modal behavior:
	•	Dark overlay
	•	Close button
	•	ESC closes
	•	Only one modal at a time

⸻

10.3 Cluster Click → Modal

Centered modal.

Content

Title (bold, large):
Category Name

Below:
	•	Total startups in category
	•	Total funding (sum of visible startups)
	•	Category description (~6 sentences)

Funding sum:

sum(total_funding for category_id)


⸻

11. Filtering

Filtering affects visible dataset and recomputes hulls.

⸻

11.1 User Group
	•	Multi-select dropdown
	•	Checkbox list
	•	Default: all selected

Filter rule:

startup.user_group in selected_groups


⸻

11.2 Age (Data-Driven Slider)

Derived:

age = current_year - year_founded

Range computation:
	•	Compute minAgeData and maxAgeData from valid ages
	•	UI bounds:
	•	minAgeUI = max(0, floor(minAgeData))
	•	maxAgeUI = min(60, ceil(maxAgeData))
	•	If span < 10 years:
	•	Expand to 10-year minimum span
	•	Clamp to 0–60

Default selection:
	•	Full range

Invalid year:
	•	Startup still renders
	•	Excluded from age filtering

⸻

11.3 Total Funding (Bucket Chips)

Buckets:
	•	0–$5M → [0, 5,000,000)
	•	$5–$20M → [5,000,000, 20,000,000)
	•	$20–$100M → [20,000,000, 100,000,000)
	•	$100M+ → [100,000,000, ∞)

Default: all selected

Controls:
	•	All
	•	Clear

Filter rule:
Startup included if funding falls into ANY selected bucket.

Invalid funding:
	•	Treated as 0

⸻

11.4 Filter Behavior

On filter change:
	1.	Filter startups
	2.	Recompute:
	•	Visible startups
	•	Hulls
	•	Cluster aggregates
	3.	Rebuild quadtree
	4.	Redraw canvas

Empty filter state:
	•	Map shows zero startups
	•	No hulls rendered

⸻

12. Performance Requirements

At 2,000 startups:
	•	Initial render < 300ms
	•	Smooth zoom (60fps)
	•	Filter recompute < 200ms

Implementation constraints:
	•	Canvas for dots
	•	No per-dot DOM nodes
	•	Use quadtree for hit detection
	•	Use requestAnimationFrame for redraw

⸻

13. Determinism
	•	Category colors must be deterministic from category_id
	•	Stable across reloads
	•	No random color generation

⸻

14. Acceptance Criteria

Rendering:
	•	Dots positioned correctly
	•	Hulls render for ≥3 startups
	•	Labels readable and hide below zoom threshold

Startup Modal:
	•	All fields displayed correctly
	•	URL clickable when valid
	•	Funding formatted

Cluster Modal:
	•	Correct startup count
	•	Correct funding sum
	•	Description displayed

Filtering:
	•	Updates instantly
	•	Hulls recompute
	•	Counts correct

Data Loading:
	•	Default dataset loads automatically
	•	Upload override works
	•	Reset works

Performance:
	•	No lag at 2000 startups

⸻

15. Summary

This specification defines a deterministic, interactive startup landscape demo:
	•	2,000 startups
	•	50 categories
	•	Automatic hull generation
	•	Rich startup and category modals
	•	Data-driven filters
	•	Static deployable via Vite build
	•	Suitable for DigitalOcean static hosting
