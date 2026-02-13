/**
 * Generates demo-startups.csv and demo-categories.csv
 * 800 startups: 90% (720) in 13 clusters with hulls, 10% (80) unclustered (no hull, float between)
 * Run: node scripts/generate-demo-data.cjs
 */

const fs = require('fs')
const path = require('path')

const CATEGORIES = [
  { id: 'cat1', name: 'AI/ML', desc: 'The AI and machine learning category encompasses startups building intelligent systems that learn from data. These companies develop algorithms for natural language processing, computer vision, and predictive analytics. Enterprise adoption has accelerated as models become more accessible and cost-effective. Key applications include automation, personalization, and decision support across industries. The market is evolving rapidly with foundation models and generative AI opening new possibilities. Startups in this space range from infrastructure providers to vertical-specific AI applications.' },
  { id: 'cat2', name: 'HealthTech', desc: 'HealthTech startups are transforming healthcare delivery through digital innovation. This category includes companies building electronic health records, telemedicine platforms, diagnostic tools, and patient engagement apps. Regulatory compliance and clinical validation are critical success factors. The sector has seen strong growth driven by pandemic-era adoption and ongoing healthcare cost pressures. Investors are particularly interested in solutions that improve outcomes while reducing costs. Integration with existing healthcare IT systems remains a key challenge for many startups.' },
  { id: 'cat3', name: 'FinTech', desc: 'FinTech startups are disrupting traditional financial services with technology-first approaches. This category covers payments, lending, wealth management, insurance tech, and blockchain-based solutions. Regulatory landscape varies significantly by geography and product type. Success often depends on partnerships with banks and achieving critical mass in transactions or users. The sector continues to attract substantial venture capital despite macroeconomic headwinds. Embedded finance and B2B payments are among the fastest-growing segments.' },
  { id: 'cat4', name: 'Infrastructure', desc: 'Infrastructure startups provide the foundational technology that powers modern applications. This includes cloud computing, databases, networking, security, and developer tools. Many successful companies in this space follow a bottom-up adoption strategy, starting with developers before expanding to enterprise sales. The category benefits from the ongoing shift to cloud-native architectures and distributed systems. Open source and developer experience are key differentiators. Competition with hyperscalers remains a strategic consideration for many startups.' },
  { id: 'cat5', name: 'EdTech', desc: 'EdTech startups are reimagining education through technology. This category includes learning management systems, online courses, tutoring platforms, and assessment tools. The pandemic accelerated adoption of digital learning across K-12, higher education, and corporate training. Personalization and accessibility are key trends. Many startups focus on upskilling and reskilling for the evolving job market. Monetization remains challenging with freemium and B2B2C models common.' },
  { id: 'cat6', name: 'E-commerce', desc: 'E-commerce startups are reshaping retail and direct-to-consumer sales. This category covers marketplaces, D2C brands, fulfillment solutions, and checkout infrastructure. Social commerce and live shopping are growing rapidly. Sustainability and supply chain transparency are increasingly important to consumers. Startups often differentiate through niche focus, technology-enabled logistics, or unique customer experiences. International expansion and omnichannel strategies are key growth levers.' },
  { id: 'cat7', name: 'Cybersecurity', desc: 'Cybersecurity startups protect organizations from evolving threats. This category includes identity management, endpoint protection, cloud security, and threat intelligence. Zero trust and AI-driven detection are dominant trends. Regulatory requirements are driving demand across industries. Talent shortage remains a constraint on growth. Consolidation is expected as the market matures. Startups often focus on specific attack vectors or compliance verticals.' },
  { id: 'cat8', name: 'PropTech', desc: 'PropTech startups are digitizing real estate and property management. This category covers listing platforms, property management software, construction tech, and smart building solutions. Residential and commercial segments have different adoption curves. Economic cycles significantly impact funding and growth. Sustainability and ESG reporting are emerging priorities. Integration with legacy systems and industry relationships are critical for success.' },
  { id: 'cat9', name: 'DevTools', desc: 'DevTools startups build software for software developers. This category includes IDEs, CI/CD, testing, observability, and API platforms. Developer experience and time-to-value are key differentiators. Open source and community adoption often precede commercial success. The rise of AI-assisted coding is creating new opportunities. Pricing typically follows usage or seat-based models. Competition with large platform vendors is a constant consideration.' },
  { id: 'cat10', name: 'ClimateTech', desc: 'ClimateTech startups address environmental challenges through technology. This category includes carbon accounting, renewable energy, sustainable materials, and climate adaptation solutions. Regulatory tailwinds and corporate net-zero commitments are driving demand. Hardware and software solutions coexist with different capital requirements. Measurement and verification remain complex. Long sales cycles and policy dependence are common challenges.' },
  { id: 'cat11', name: 'HRTech', desc: 'HRTech startups modernize human resources and talent management. This category covers recruiting, onboarding, payroll, benefits, and employee engagement platforms. Remote work has accelerated adoption of collaboration and productivity tools. AI is increasingly used for screening, matching, and analytics. Integration with existing HRIS is critical. SMB and enterprise segments have different needs and sales motions. Compliance varies by geography.' },
  { id: 'cat12', name: 'MarketingTech', desc: 'MarketingTech startups enable data-driven marketing and customer engagement. This category includes CRM, marketing automation, analytics, and attribution platforms. Privacy regulations are reshaping the landscape. First-party data and consent management are priorities. AI is used for personalization and optimization. Fragmentation persists with point solutions and all-in-one platforms competing. Integration ecosystems and partner networks are important.' },
  { id: 'cat13', name: 'SaaS', desc: 'SaaS startups deliver software as a service across verticals and functions. This category encompasses horizontal productivity tools and vertical-specific applications. Subscription economics and predictable revenue attract investors. Land-and-expand and product-led growth are common strategies. Competition from incumbents and new entrants is intense. International expansion and localization are key growth levers. Profitability focus has increased in recent years.' },
]

const PREFIXES = ['Acme', 'Data', 'Cloud', 'Smart', 'Tech', 'Flow', 'Nexus', 'Prime', 'Core', 'Vertex', 'Apex', 'Pulse', 'Sync', 'Vault', 'Spark', 'Nova', 'Luma', 'Orbit', 'Zenith', 'Atlas', 'Helix', 'Cipher', 'Flux', 'Prism', 'Echo', 'Forge', 'Lattice', 'Meridian', 'Quantum', 'Stride', 'Terra', 'Umbra', 'Vector', 'Warp', 'Xylo', 'Yield', 'Zephyr', 'Bolt', 'Crest', 'Drift', 'Ember', 'Frost', 'Glint', 'Haven', 'Iris', 'Jade', 'Kite', 'Lens', 'Mint']
const SUFFIXES = ['AI', 'Flow', 'Labs', 'Hub', 'Stack', 'Base', 'Cloud', 'Sync', 'Pro', 'Tech', 'IQ', 'OS', 'Net', 'Link', 'Grid', 'Wave', 'Path', 'Bridge', 'Scope', 'Forge', 'Pulse', 'Vault', 'Nexus', 'Core', 'Edge', 'Beam', 'Byte', 'Code', 'Data', 'Logic', 'Mesh', 'Node', 'Port', 'Quest', 'Rise', 'Signal', 'Tide', 'Unit', 'View', 'Wise', 'X', 'Yard', 'Zone', '360', 'One', 'Plus', 'Max', 'Lite', 'Go', 'Now']
const CITIES = ['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston', 'Denver', 'Chicago', 'Miami', 'Portland', 'Atlanta', 'Los Angeles', 'San Diego', 'Philadelphia', 'London', 'Berlin', 'Paris', 'Amsterdam', 'Tel Aviv', 'Singapore', 'Toronto', 'Sydney']
const COUNTRIES = ['USA', 'USA', 'USA', 'USA', 'USA', 'USA', 'USA', 'USA', 'UK', 'Germany', 'France', 'Netherlands', 'Israel', 'Singapore', 'Canada', 'Australia']
const USER_GROUPS = ['Enterprise', 'SMB', 'Consumer', 'Developer']
const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Jamie', 'Skyler', 'Sam', 'Chris', 'Pat', 'Robin', 'Drew', 'Blake', 'Cameron', 'Dakota', 'Emery', 'Finley']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White']

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)]
}
function gaussian(mean, std) {
  const u1 = Math.random(), u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * std
}

function generateName(used) {
  for (let i = 0; i < 100; i++) {
    const p = randomChoice(PREFIXES)
    const s = randomChoice(SUFFIXES)
    const name = `${p} ${s}`
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  return `Startup ${used.size + 1}`
}

function escapeCsv(val) {
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function distToClusters(x, y, clusterCenters, minDist) {
  return clusterCenters.every(([cx, cy]) => Math.hypot(x - cx, y - cy) >= minDist)
}

function randomInGap(clusterCenters, bounds, minDistFromCluster) {
  for (let tries = 0; tries < 300; tries++) {
    const x = Math.random() * bounds
    const y = Math.random() * bounds
    if (distToClusters(x, y, clusterCenters, minDistFromCluster)) return [x, y]
  }
  const c1 = clusterCenters[randomInt(0, clusterCenters.length - 1)]
  const c2 = clusterCenters[randomInt(0, clusterCenters.length - 1)]
  const t = 0.3 + Math.random() * 0.4
  return [
    c1[0] + t * (c2[0] - c1[0]) + (Math.random() - 0.5) * 40,
    c1[1] + t * (c2[1] - c1[1]) + (Math.random() - 0.5) * 40
  ]
}

function generateStartups() {
  const usedNames = new Set()
  const counts = [56, 56, 56, 56, 56, 55, 55, 55, 55, 55, 55, 55, 55]
  const MIN_DIST = 180
  const BOUNDS = 900
  const clusterCenters = []
  for (let i = 0; i < 13; i++) {
    let x, y, ok
    for (let tries = 0; tries < 500; tries++) {
      x = MIN_DIST + Math.random() * (BOUNDS - 2 * MIN_DIST)
      y = MIN_DIST + Math.random() * (BOUNDS - 2 * MIN_DIST)
      ok = clusterCenters.every(([cx, cy]) =>
        Math.hypot(x - cx, y - cy) >= MIN_DIST
      )
      if (ok) break
    }
    clusterCenters.push([x, y])
  }
  const CLUSTER_RADIUS = 45
  const FLOATER_COUNT = 80
  const FLOATER_CATEGORIES = 40
  const MIN_DIST_FROM_CLUSTER = 70
  const rows = []
  let id = 1
  for (let c = 0; c < 13; c++) {
    const cat = CATEGORIES[c]
    const n = counts[c]
    const [cx, cy] = clusterCenters[c]
    const spread = CLUSTER_RADIUS * 0.6
    for (let i = 0; i < n; i++) {
      const x = cx + gaussian(0, spread)
      const y = cy + gaussian(0, spread)
      const name = generateName(usedNames)
      const year = randomInt(2016, 2023)
      const fundingTiers = [500000, 2000000, 8000000, 25000000, 60000000, 150000000]
      const funding = fundingTiers[randomInt(0, fundingTiers.length - 1)] * (0.5 + Math.random())
      const city = randomChoice(CITIES)
      const country = randomChoice(COUNTRIES)
      const userGroup = randomChoice(USER_GROUPS)
      const first = randomChoice(FIRST_NAMES)
      const last = randomChoice(LAST_NAMES)
      const domain = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.io'
      const desc = `${name} provides innovative solutions for modern businesses. Our platform helps companies streamline operations and drive growth. Trusted by teams worldwide.`
      rows.push({
        id: `s${id}`,
        name,
        website_url: `https://${domain}`,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        category_id: cat.id,
        category_name: cat.name,
        year_founded: year,
        total_funding: Math.round(funding),
        hq_country: country,
        hq_city: city,
        contact_person: `${first} ${last}`,
        description: desc,
        user_group: userGroup,
      })
      id++
    }
  }
  for (let f = 0; f < FLOATER_COUNT; f++) {
    const [x, y] = randomInGap(clusterCenters, BOUNDS, MIN_DIST_FROM_CLUSTER)
    const catId = `float-${Math.floor(f / 2) + 1}`
    const name = generateName(usedNames)
    const year = randomInt(2016, 2023)
    const fundingTiers = [500000, 2000000, 8000000, 25000000, 60000000, 150000000]
    const funding = fundingTiers[randomInt(0, fundingTiers.length - 1)] * (0.5 + Math.random())
    const city = randomChoice(CITIES)
    const country = randomChoice(COUNTRIES)
    const userGroup = randomChoice(USER_GROUPS)
    const first = randomChoice(FIRST_NAMES)
    const last = randomChoice(LAST_NAMES)
    const domain = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.io'
    const desc = `${name} provides innovative solutions for modern businesses. Our platform helps companies streamline operations and drive growth. Trusted by teams worldwide.`
    rows.push({
      id: `s${id}`,
      name,
      website_url: `https://${domain}`,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      category_id: catId,
      category_name: 'Uncategorized',
      year_founded: year,
      total_funding: Math.round(funding),
      hq_country: country,
      hq_city: city,
      contact_person: `${first} ${last}`,
      description: desc,
      user_group: userGroup,
    })
    id++
  }
  return { rows, floaterCategoryCount: FLOATER_CATEGORIES }
}

function main() {
  const { rows: startups, floaterCategoryCount } = generateStartups()
  const header = 'id,name,website_url,x,y,category_id,category_name,year_founded,total_funding,hq_country,hq_city,contact_person,description,user_group'
  const startupLines = [header, ...startups.map(s =>
    [s.id, s.name, s.website_url, s.x, s.y, s.category_id, s.category_name, s.year_founded, s.total_funding, s.hq_country, s.hq_city, s.contact_person, s.description, s.user_group].map(escapeCsv).join(',')
  )]
  const floaterCategories = Array.from({ length: floaterCategoryCount }, (_, i) => ({
    id: `float-${i + 1}`,
    name: 'Uncategorized',
    desc: 'No description available.'
  }))
  const allCategories = [...CATEGORIES, ...floaterCategories]
  const categoriesLines = [
    'category_id,category_name,category_description',
    ...allCategories.map(c => [c.id, c.name, c.desc].map(escapeCsv).join(','))
  ]
  const publicDir = path.join(__dirname, '..', 'public')
  fs.writeFileSync(path.join(publicDir, 'demo-startups.csv'), startupLines.join('\n'))
  fs.writeFileSync(path.join(publicDir, 'demo-categories.csv'), categoriesLines.join('\n'))
  const clusteredCount = 720
  const unclusteredCount = startups.length - clusteredCount
  console.log(`Generated ${startups.length} startups: ${clusteredCount} in 13 clusters, ${unclusteredCount} unclustered (${CATEGORIES.length + floaterCategoryCount} categories)`)
}

main()
