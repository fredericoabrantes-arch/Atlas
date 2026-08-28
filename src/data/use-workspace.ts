import { useState } from 'react'
import { demoAssets, demoPortfolio, demoTransactions } from './demo'
import { createWorkspace, loadWorkspace, saveWorkspace } from './workspace'
import type { Asset, Transaction } from '../domain/models'

const browserStorage = () => typeof window === 'undefined' ? null : window.localStorage

export function useWorkspace() {
  const [loadWarning] = useState(() => {
    const storage = browserStorage()
    if (!storage) return null
    const loaded = loadWorkspace(storage)
    return loaded.status === 'CORRUPT' ? loaded.message : null
  })
  const [workspace, setWorkspace] = useState(() => {
    const storage = browserStorage()
    if (storage) {
      const loaded = loadWorkspace(storage)
      if (loaded.status === 'READY') return loaded.workspace
    }
    return createWorkspace(demoPortfolio, demoAssets, demoTransactions)
  })

  const update = (assets: Asset[], transactions: Transaction[]) => {
    const mergedAssets = new Map(workspace.assets.map((asset) => [asset.id, asset]))
    assets.forEach((asset) => mergedAssets.set(asset.id, asset))
    const next = createWorkspace(workspace.portfolio, [...mergedAssets.values()], [...workspace.transactions, ...transactions])
    const storage = browserStorage()
    setWorkspace(storage ? saveWorkspace(storage, next) : next)
  }

  return { workspace, loadWarning, importData: update }
}

