import { z } from 'zod'
import { AssetSchema, PortfolioSchema, TransactionSchema } from '../domain/models'
import type { Asset, Portfolio, Transaction } from '../domain/models'

export const WORKSPACE_VERSION = 1
export const WORKSPACE_STORAGE_KEY = 'atlas.workspace.v1'

const StoredTransactionSchema = TransactionSchema

export const WorkspaceSchema = z.object({
  version: z.literal(WORKSPACE_VERSION),
  portfolio: PortfolioSchema,
  assets: z.array(AssetSchema),
  transactions: z.array(StoredTransactionSchema),
  updatedAt: z.coerce.date(),
})

export interface Workspace {
  version: typeof WORKSPACE_VERSION
  portfolio: Portfolio
  assets: Asset[]
  transactions: Transaction[]
  updatedAt: Date
}

export type WorkspaceLoadResult =
  | { status: 'EMPTY' }
  | { status: 'READY'; workspace: Workspace }
  | { status: 'CORRUPT'; message: string }

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createWorkspace(portfolio: Portfolio, assets: Asset[], transactions: Transaction[]): Workspace {
  return WorkspaceSchema.parse({
    version: WORKSPACE_VERSION,
    portfolio,
    assets,
    transactions,
    updatedAt: new Date(),
  })
}

export function loadWorkspace(storage: StorageAdapter): WorkspaceLoadResult {
  const raw = storage.getItem(WORKSPACE_STORAGE_KEY)
  if (!raw) return { status: 'EMPTY' }

  try {
    const parsed = WorkspaceSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      return { status: 'CORRUPT', message: 'Saved Atlas data does not match workspace version 1.' }
    }
    return { status: 'READY', workspace: parsed.data }
  } catch {
    return { status: 'CORRUPT', message: 'Saved Atlas data is not valid JSON.' }
  }
}

export function saveWorkspace(storage: StorageAdapter, workspace: Workspace): Workspace {
  const validated = WorkspaceSchema.parse({ ...workspace, updatedAt: new Date() })
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(validated))
  return validated
}

export function clearWorkspace(storage: StorageAdapter): void {
  storage.removeItem(WORKSPACE_STORAGE_KEY)
}
