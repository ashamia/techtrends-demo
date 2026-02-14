import { useEffect, useCallback } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  contentClassName?: string
}

export function Modal({ isOpen, onClose, title, children, contentClassName }: ModalProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEsc])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`modal-content ${contentClassName ?? ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
