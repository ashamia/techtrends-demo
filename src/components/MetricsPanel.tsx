export function MetricsPanel() {
  return (
    <div className="metrics-panel">
      <div className="metric">
        <span className="metric-label">Average funding</span>
        <span className="metric-value">$38M</span>
      </div>
      <div className="metric">
        <span className="metric-label">Median age</span>
        <span className="metric-value">6 years</span>
      </div>
      <div className="metric">
        <span className="metric-label">Largest category</span>
        <span className="metric-value">SaaS (142)</span>
      </div>
      <div className="metric">
        <span className="metric-label">Fastest growing</span>
        <span className="metric-value">AI/ML</span>
      </div>
    </div>
  )
}
