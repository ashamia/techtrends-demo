import { useState, useCallback } from 'react'
import { Modal } from './Modal'
import {
  parseStartupsCsv,
  parseCategoriesCsv,
  validateStartupsColumns,
  validateCategoriesColumns,
} from '../data/parse'
import type { Startup, Category } from '../types'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onLoad: (startups: Startup[], categories: Category[]) => void
}

export function UploadModal({ isOpen, onClose, onLoad }: UploadModalProps) {
  const [startupsFile, setStartupsFile] = useState<File | null>(null)
  const [categoriesFile, setCategoriesFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateAndLoad = useCallback(async () => {
    if (!startupsFile || !categoriesFile) return
    setError(null)
    try {
      const [startupsText, categoriesText] = await Promise.all([
        startupsFile.text(),
        categoriesFile.text(),
      ])
      if (!validateStartupsColumns(startupsText)) {
        setError('Startups CSV is missing required columns.')
        return
      }
      if (!validateCategoriesColumns(categoriesText)) {
        setError('Categories CSV is missing required columns.')
        return
      }
      const startups = parseStartupsCsv(startupsText)
      const categories = parseCategoriesCsv(categoriesText)
      onLoad(startups, categories)
      setStartupsFile(null)
      setCategoriesFile(null)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load files.')
    }
  }, [startupsFile, categoriesFile, onLoad, onClose])

  const canLoad = startupsFile && categoriesFile && !error
  const handleStartupsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setStartupsFile(f ?? null)
    setError(null)
  }
  const handleCategoriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setCategoriesFile(f ?? null)
    setError(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Custom Data">
      <div className="upload-form">
        <div className="upload-field">
          <label>Startups CSV (required)</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleStartupsChange}
          />
          {startupsFile && <span className="file-name">{startupsFile.name}</span>}
        </div>
        <div className="upload-field">
          <label>Categories CSV (required)</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleCategoriesChange}
          />
          {categoriesFile && <span className="file-name">{categoriesFile.name}</span>}
        </div>
        {error && <p className="upload-error">{error}</p>}
        <button
          type="button"
          className="btn btn-primary"
          onClick={validateAndLoad}
          disabled={!canLoad}
        >
          Load
        </button>
      </div>
    </Modal>
  )
}
