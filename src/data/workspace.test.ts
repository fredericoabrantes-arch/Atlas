import { describe, expect, it } from 'vitest'
import { demoAssets, demoPortfolio, demoTransactions } from './demo'
import { createWorkspace, loadWorkspace, saveWorkspace, WORKSPACE_STORAGE_KEY } from './workspace'

function memoryStorage(initial?: string) {
  const data = new Map<string, string>()
  if (initial) data.set(WORKSPACE_STORAGE_KEY, initial)
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) }
}

describe('workspace persistence', () => {
  it('round-trips dates and validated data', () => {
    const storage = memoryStorage()
    saveWorkspace(storage, createWorkspace(demoPortfolio, demoAssets, demoTransactions))
    const loaded = loadWorkspace(storage)
    expect(loaded.status).toBe('READY')
    if (loaded.status === 'READY') expect(loaded.workspace.transactions[0].date).toBeInstanceOf(Date)
  })
  it('reports empty and corrupt storage safely', () => {
    expect(loadWorkspace(memoryStorage()).status).toBe('EMPTY')
    expect(loadWorkspace(memoryStorage('{bad json')).status).toBe('CORRUPT')
  })
})

