// src/databaseOperations.ts
import type {
  RufasDatabase,
  RufasFile,
  RufasTag,
  RufasBundle,
} from './database'

let databaseDirHandle: FileSystemDirectoryHandle | null = null

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

// Update file
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

// Update files
export async function updateFiles(files: RufasFile[]): Promise<void> {
  return writeJsonFile('files.json', files)
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
  // Get both bundles and files
  const [bundles, files] = await Promise.all([getAllBundles(), getAllFiles()])

  // Create the new bundle
  const newBundle: RufasBundle = {
    ...bundle,
    id: `b_${Date.now()}`,
    createdAt: Date.now(),
    lastBundled: Date.now(),
    status: 'fresh',
  }
  bundles.push(newBundle)

  // Update the files to include this bundle ID
  const updatedFiles = files.map((file) => {
    if (bundle.fileIds.includes(file.id)) {
      return {
        ...file,
        bundleIds: [...(file.bundleIds || []), newBundle.id],
      }
    }
    return file
  })

  // Update both files in parallel
  await Promise.all([updateBundles(bundles), updateFiles(updatedFiles)])

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

// Clean up references when a file is deleted
export async function cleanupDeletedFile(filePath: string): Promise<void> {
  try {
    // Get current data
    const [files, tags, bundles] = await Promise.all([
      getAllFiles(),
      getAllTags(),
      getAllBundles(),
    ])

    // Find the file ID that matches this path
    const fileId = files.find((f) => f.path === filePath)?.id

    if (!fileId) return

    // Remove file from tags using the actual fileId
    const updatedTags = tags.map((tag) => ({
      ...tag,
      fileIds: tag.fileIds.filter((id) => id !== fileId),
    }))

    // Remove file from bundles
    const updatedBundles = bundles.map((bundle) => ({
      ...bundle,
      fileIds: bundle.fileIds.filter((id) => id !== fileId),
      status: bundle.fileIds.includes(fileId)
        ? ('stale' as const)
        : bundle.status,
    }))

    // Save updates
    await Promise.all([updateTags(updatedTags), updateBundles(updatedBundles)])
  } catch (error) {
    console.error('Failed to cleanup deleted file references:', error)
    throw error
  }
}

// Clean up references when a tag is deleted
export async function cleanupDeletedTag(tagId: string): Promise<void> {
  try {
    // Get current files
    const files = await getAllFiles()

    // Remove tag from all files
    const updatedFiles = files.map((file) => ({
      ...file,
      tagIds: file.tagIds.filter((id) => id !== tagId),
    }))

    // Save updates
    await updateFiles(updatedFiles)
  } catch (error) {
    console.error('Failed to cleanup deleted tag references:', error)
    throw error
  }
}

// Clean up references when a bundle is deleted
export async function cleanupDeletedBundle(bundleId: string): Promise<void> {
  try {
    // Get current files
    const files = await getAllFiles()

    // Remove bundle from all files
    const updatedFiles = files.map((file) => ({
      ...file,
      bundleIds: file.bundleIds.filter((id) => id !== bundleId),
    }))

    // Save updates
    await updateFiles(updatedFiles)
  } catch (error) {
    console.error('Failed to cleanup deleted bundle references:', error)
    throw error
  }
}

// Validate and cleanup orphaned references
export async function validateReferences(): Promise<void> {
  try {
    const [files, tags, bundles] = await Promise.all([
      getAllFiles(),
      getAllTags(),
      getAllBundles(),
    ])

    // Create sets for faster lookups
    const fileIds = new Set(files.map((f) => f.id))
    const tagIds = new Set(tags.map((t) => t.id))
    const bundleIds = new Set(bundles.map((b) => b.id))

    // Clean up files
    const updatedFiles = files.map((file) => ({
      ...file,
      tagIds: file.tagIds.filter((id) => tagIds.has(id)),
      bundleIds: file.bundleIds.filter((id) => bundleIds.has(id)),
    }))

    // Clean up tags
    const updatedTags = tags.map((tag) => ({
      ...tag,
      fileIds: tag.fileIds.filter((id) => fileIds.has(id)),
    }))

    // Clean up bundles
    const updatedBundles = bundles.map((bundle) => ({
      ...bundle,
      fileIds: bundle.fileIds.filter((id) => fileIds.has(id)),
      // Update status if any files were removed
      status: bundle.fileIds.some((id) => !fileIds.has(id))
        ? ('stale' as const)
        : bundle.status,
    }))

    // Save all updates
    await Promise.all([
      updateFiles(updatedFiles),
      updateTags(updatedTags),
      updateBundles(updatedBundles),
    ])
  } catch (error) {
    console.error('Failed to validate and cleanup references:', error)
    throw error
  }
}

// Helper function to update bundle statuses based on file modifications
export async function updateBundleStatusesForFile(
  filePath: string
): Promise<void> {
  try {
    const bundles = await getAllBundles()
    const updatedBundles = bundles.map((bundle) => {
      if (bundle.fileIds.includes(filePath)) {
        return {
          ...bundle,
          status: 'stale' as const,
        }
      }
      return bundle
    })

    await updateBundles(updatedBundles)
  } catch (error) {
    console.error('Failed to update bundle statuses:', error)
    throw error
  }
}

// removeTagFromFile mfer
export async function removeTagFromFile(
  tagId: string,
  filePath: string
): Promise<void> {
  try {
    // Get current files and tags
    const [files, tags] = await Promise.all([getAllFiles(), getAllTags()])

    // Update file
    const updatedFiles = files.map((file) => {
      if (file.id === filePath) {
        return {
          ...file,
          tagIds: file.tagIds.filter((id) => id !== tagId),
        }
      }
      return file
    })

    // Update tag
    const updatedTags = tags.map((tag) => {
      if (tag.id === tagId) {
        return {
          ...tag,
          fileIds: tag.fileIds.filter((id) => id !== filePath),
        }
      }
      return tag
    })

    // Save both updates
    await Promise.all([updateFiles(updatedFiles), updateTags(updatedTags)])
  } catch (error) {
    console.error('Failed to remove tag from file:', error)
    throw error
  }
}

// In databaseOperations.ts
export async function synchronizeDatabase(
  currentFiles: RufasFile[]
): Promise<void> {
  try {
    // 1. Get current state of all three files
    const [existingFiles, tags, bundles] = await Promise.all([
      getAllFiles(),
      getAllTags(),
      getAllBundles(),
    ])

    // 2. Update files.json - preserve tags/bundles for existing files
    const updatedFiles = currentFiles.map((newFile) => {
      const existingFile = existingFiles.find((f) => f.id === newFile.id)
      if (existingFile) {
        return {
          ...newFile,
          tagIds: existingFile.tagIds,
          bundleIds: existingFile.bundleIds,
        }
      }
      return newFile
    })

    // Create a Set of valid file IDs for efficient lookup
    const validFileIds = new Set(updatedFiles.map((f) => f.id))

    // 3. Clean tags.json - remove references to non-existent files
    const updatedTags = tags.map((tag) => ({
      ...tag,
      fileIds: tag.fileIds.filter((fileId) => validFileIds.has(fileId)),
    }))

    // 4. Clean bundles.json - remove references to non-existent files
    const updatedBundles = bundles.map((bundle) => ({
      ...bundle,
      fileIds: bundle.fileIds.filter((fileId) => validFileIds.has(fileId)),
      status: bundle.fileIds.some((fileId) => !validFileIds.has(fileId))
        ? ('stale' as const)
        : bundle.status,
    }))

    // 5. Write all files back in one atomic operation
    await Promise.all([
      updateFiles(updatedFiles),
      updateTags(updatedTags),
      updateBundles(updatedBundles),
    ])
  } catch (error) {
    console.error('Failed to synchronize database:', error)
    throw error
  }
}
