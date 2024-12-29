// src/databaseOperations.ts
import type {
  RufasDatabase,
  RufasFile,
  RufasTag,
  RufasBundle,
} from './database'

let databaseDirHandle: FileSystemDirectoryHandle | null = null

// const DB_PATH = '.rufas/database'

// initialize database directory
export async function initializeDatabaseDir(
  rootDirHandle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // Set the database directory handle first
    databaseDirHandle = await rootDirHandle.getDirectoryHandle('.rufas', {
      create: true,
    })

    // Then get/create the database subdirectory
    const dbDirHandle = await databaseDirHandle.getDirectoryHandle('database', {
      create: true,
    })

    // Make sure all required files exist
    await Promise.all([
      dbDirHandle.getFileHandle('files.json', { create: true }),
      dbDirHandle.getFileHandle('tags.json', { create: true }),
      dbDirHandle.getFileHandle('bundles.json', { create: true }),
    ])

    return true
  } catch (error) {
    console.error('Failed to initialize database directory:', error)
    return false
  }
}

// Initialize database structure (only for new databases)
export async function initializeDatabase(
  rootDirHandle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // This will set databaseDirHandle
    await initializeDatabaseDir(rootDirHandle)

    const emptyDb: RufasDatabase = {
      files: [],
      tags: [],
      bundles: [],
    }

    // Only write empty files if they don't have content
    const dbDirHandle = await databaseDirHandle!.getDirectoryHandle(
      'database',
      {
        create: false,
      }
    )

    // Check if files are empty before writing
    for (const [filename, data] of Object.entries({
      'files.json': emptyDb.files,
      'tags.json': emptyDb.tags,
      'bundles.json': emptyDb.bundles,
    })) {
      const fileHandle = await dbDirHandle.getFileHandle(filename, {
        create: false,
      })
      const file = await fileHandle.getFile()
      const content = await file.text()

      // Only write if file is empty
      if (!content.trim()) {
        await writeJsonFile(filename, data)
      }
    }

    return true
  } catch (error) {
    console.error('Failed to initialize database:', error)
    return false
  }
}

// Generic function to read a JSON file
async function readJsonFile<T>(filename: string): Promise<T> {
  if (!databaseDirHandle) {
    throw new Error('Database directory not initialized')
  }

  try {
    const dbDirHandle = await databaseDirHandle.getDirectoryHandle('database', {
      create: false,
    })
    const fileHandle = await dbDirHandle.getFileHandle(filename, {
      create: false,
    })
    const file = await fileHandle.getFile()
    const contents = await file.text()
    return contents.trim() ? JSON.parse(contents) : []
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
    throw error
  }
}

// Generic function to write a JSON file
async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  if (!databaseDirHandle) {
    throw new Error('Database directory not initialized')
  }

  try {
    const dbDirHandle = await databaseDirHandle.getDirectoryHandle('database', {
      create: false,
    })
    const fileHandle = await dbDirHandle.getFileHandle(filename, {
      create: true,
    })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  } catch (error) {
    console.error(`Error writing ${filename}:`, error)
    throw error
  }
}

// File operations
export async function getAllFiles(): Promise<RufasFile[]> {
  return readJsonFile<RufasFile[]>('files.json')
}

export async function updateFiles(files: RufasFile[]): Promise<void> {
  return writeJsonFile('files.json', files)
}

export async function updateFile(file: RufasFile): Promise<void> {
  const files = await getAllFiles()
  const index = files.findIndex((f) => f.id === file.id)
  if (index >= 0) {
    files[index] = file
  } else {
    files.push(file)
  }
  return updateFiles(files)
}

// Tag operations
export async function getAllTags(): Promise<RufasTag[]> {
  return readJsonFile<RufasTag[]>('tags.json')
}

export async function updateTags(tags: RufasTag[]): Promise<void> {
  return writeJsonFile('tags.json', tags)
}

export async function createTag(tag: Omit<RufasTag, 'id'>): Promise<RufasTag> {
  const tags = await getAllTags()
  const newTag: RufasTag = {
    ...tag,
    id: `t_${Date.now()}`,
  }
  tags.push(newTag)
  await updateTags(tags)
  return newTag
}

// Bundle operations
export async function getAllBundles(): Promise<RufasBundle[]> {
  return readJsonFile<RufasBundle[]>('bundles.json')
}

export async function updateBundles(bundles: RufasBundle[]): Promise<void> {
  return writeJsonFile('bundles.json', bundles)
}

export async function createBundle(
  bundle: Omit<RufasBundle, 'id' | 'createdAt' | 'lastBundled' | 'status'>
): Promise<RufasBundle> {
  const bundles = await getAllBundles()
  const newBundle: RufasBundle = {
    ...bundle,
    id: `b_${Date.now()}`,
    createdAt: Date.now(),
    lastBundled: Date.now(),
    status: 'fresh',
  }
  bundles.push(newBundle)
  await updateBundles(bundles)
  return newBundle
}

// Update bundle status based on file modifications
export async function updateBundleStatuses(): Promise<void> {
  const [files, bundles] = await Promise.all([getAllFiles(), getAllBundles()])

  const updatedBundles = bundles.map((bundle) => {
    // Skip master bundles as they're handled differently
    if (bundle.isMaster) return bundle

    // Check if any files in the bundle have been modified since last bundling
    const isStale = bundle.fileIds.some((fileId) => {
      const file = files.find((f) => f.id === fileId)
      return file && file.lastModified > bundle.lastBundled
    })

    return {
      ...bundle,
      status: (isStale ? 'stale' : 'fresh') as RufasBundle['status'],
    }
  })

  await updateBundles(updatedBundles)
}

// Utility function to remove orphaned files
export async function cleanupOrphanedFiles(
  currentPaths: string[]
): Promise<void> {
  const files = await getAllFiles()
  const [tags, bundles] = await Promise.all([getAllTags(), getAllBundles()])

  // Find files that no longer exist in the filesystem
  const orphanedFileIds = files
    .filter((file) => !currentPaths.includes(file.path))
    .map((file) => file.id)

  if (orphanedFileIds.length === 0) return

  // Remove orphaned files from tags
  const updatedTags = tags.map((tag) => ({
    ...tag,
    fileIds: tag.fileIds.filter((id) => !orphanedFileIds.includes(id)),
  }))

  // Remove orphaned files from bundles
  const updatedBundles = bundles.map((bundle) => ({
    ...bundle,
    fileIds: bundle.fileIds.filter((id) => !orphanedFileIds.includes(id)),
  }))

  // Remove orphaned files from files.json
  const updatedFiles = files.filter(
    (file) => !orphanedFileIds.includes(file.id)
  )

  // Update all files
  await Promise.all([
    updateFiles(updatedFiles),
    updateTags(updatedTags),
    updateBundles(updatedBundles),
  ])
}
