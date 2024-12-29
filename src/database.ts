// src/database.ts

// .rufas/database/files.json
export type RufasFile = {
  id: string // Now full path instead of generated ID
  path: string // Same as id for now (we might want to keep this separate for future file moves)
  tagIds: string[] // References to tags
  bundleIds: string[] // References to bundles
  lastModified: number // From filesystem
}

// .rufas/database/tags.json
export type RufasTag = {
  id: string // e.g. t_123
  name: string // Tag name
  description: string // Tag description
  color: string // Tag color
  fileIds: string[] // Files with this tag
}

// .rufas/database/bundles.json
// if the bundle becomes stale, it can be regenerated if desired.
export type RufasBundle = {
  id: string // e.g. b_123
  name: string // Bundle name
  description: string // Bundle description
  fileIds: string[] // Files in this bundle
  isMaster: boolean // Whether this is the master bundle
  createdAt: number // When bundle was created
  lastBundled: number // Last time bundle was generated
  status: 'fresh' | 'stale' // Stale if any included files modified after lastBundled
}

// I don't know if we need to export these from a ts file but it seemed a logical way to implment the type system that our "database" can be built from.
export type RufasDatabase = {
  files: RufasFile[]
  tags: RufasTag[]
  bundles: RufasBundle[]
}
