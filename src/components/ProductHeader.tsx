import { useState, useRef, useEffect } from 'react'

interface ProductHeaderProps {
  onUploadClick: () => void
}

export function ProductHeader({ onUploadClick }: ProductHeaderProps) {
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [displayOpen, setDisplayOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const displayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (avatarRef.current && !avatarRef.current.contains(target)) setAvatarOpen(false)
      if (exportRef.current && !exportRef.current.contains(target)) setExportOpen(false)
      if (displayRef.current && !displayRef.current.contains(target)) setDisplayOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="product-header">
      <div className="product-header-left">
        <div className="product-logo">TT</div>
        <span className="product-name">Technology Market Maps</span>
      </div>
      <div className="product-header-right">
        <div className="header-dropdown" ref={displayRef}>
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setDisplayOpen(!displayOpen)}
            title="View options"
          >
            View ▾
          </button>
          {displayOpen && (
            <div className="dropdown-menu">
              <label><input type="checkbox" defaultChecked /> Hulls</label>
              <label><input type="checkbox" defaultChecked /> Grid</label>
              <label><input type="checkbox" defaultChecked /> Cluster labels</label>
              <label><input type="checkbox" defaultChecked /> Unclustered startups</label>
              <label><input type="checkbox" /> Funding color mode</label>
            </div>
          )}
        </div>
        <div className="header-dropdown" ref={exportRef}>
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setExportOpen(!exportOpen)}
            title="Export"
          >
            Export ▾
          </button>
          {exportOpen && (
            <div className="dropdown-menu">
              <button type="button">Export visible startups (CSV)</button>
              <button type="button">Export current view as PNG</button>
              <button type="button">Export category summary (CSV)</button>
            </div>
          )}
        </div>
        <button type="button" className="header-icon-btn" title="Copy shareable link">
          Share
        </button>
        <div className="header-dropdown" ref={avatarRef}>
          <button
            type="button"
            className="avatar-btn"
            onClick={() => setAvatarOpen(!avatarOpen)}
            title="Account"
          >
            <span className="avatar-initials">JD</span>
          </button>
          {avatarOpen && (
            <div className="dropdown-menu dropdown-menu-right">
              <button type="button">My Account</button>
              <button type="button">Settings</button>
              <button type="button">API Keys</button>
              <button type="button" onClick={() => { onUploadClick(); setAvatarOpen(false); }}>
                Upload Data
              </button>
              <button type="button">Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
