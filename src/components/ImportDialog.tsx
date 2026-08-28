import { useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, LockKeyhole, Upload, X } from 'lucide-react'
import type { Asset, Transaction } from '../domain/models'
import { CSV_TEMPLATE, importTransactionsCsv } from '../data/csv-import'
import type { CsvImportResult } from '../data/csv-import'

interface ImportDialogProps {
  open: boolean
  portfolioId: string
  existingTransactionIds: Set<string>
  onClose: () => void
  onImport: (assets: Asset[], transactions: Transaction[]) => void
}

export function ImportDialog({ open, portfolioId, existingTransactionIds, onClose, onImport }: ImportDialogProps) {
  const [source, setSource] = useState(CSV_TEMPLATE)
  const [result, setResult] = useState<CsvImportResult | null>(null)
  const [completed, setCompleted] = useState(false)
  if (!open) return null

  const analyze = (value = source) => {
    setResult(importTransactionsCsv(value, portfolioId, existingTransactionIds))
    setCompleted(false)
  }
  const readFile = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { const value = String(reader.result ?? ''); setSource(value); analyze(value) }
    reader.readAsText(file)
  }
  const commit = () => {
    if (!result?.transactions.length) return
    onImport(result.assets, result.transactions)
    setCompleted(true)
  }

  return <div className="modal-backdrop" role="presentation">
    <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="import-head">
        <div><span className="import-icon"><FileSpreadsheet /></span><div><small>ATLAS DATA INTAKE</small><h2 id="import-title">Import transactions</h2></div></div>
        <button className="icon-close" onClick={onClose} aria-label="Close import"><X /></button>
      </div>
      <div className="privacy-note"><LockKeyhole /><span><b>Local-only processing.</b> This file stays in your browser and is never uploaded.</span></div>
      <label className="file-drop"><Upload /><span><b>Choose a CSV file</b><small>or paste its contents below</small></span><input type="file" accept=".csv,text/csv" onChange={(event) => readFile(event.target.files?.[0])} /></label>
      <label className="csv-label">CSV CONTENT<textarea value={source} onChange={(event) => { setSource(event.target.value); setResult(null); setCompleted(false) }} spellCheck={false} /></label>
      <button className="analyze-button" onClick={() => analyze()}>Analyze CSV</button>
      {result && <div className="import-result">
        <div className="result-counters">
          <span><b>{result.sourceRowCount}</b> source rows</span><span className="valid"><b>{result.transactions.length}</b> valid</span><span><b>{result.duplicateCount}</b> duplicates</span><span className={result.errors.length ? 'invalid' : ''}><b>{result.errors.length}</b> errors</span>
        </div>
        {result.errors.length > 0 && <div className="error-list"><AlertTriangle /> <div>{result.errors.slice(0, 4).map((error) => <p key={`${error.row}-${error.message}`}><b>Row {error.row}</b> — {error.message}</p>)}</div></div>}
        {completed && <div className="success-message"><CheckCircle2 /> Import complete. Your workspace was saved locally.</div>}
      </div>}
      <div className="modal-actions"><button className="cancel" onClick={onClose}>Cancel</button><button className="primary" disabled={!result?.transactions.length || completed} onClick={commit}>Import {result?.transactions.length ?? 0} valid rows</button></div>
    </section>
  </div>
}

