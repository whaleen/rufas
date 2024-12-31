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

// Update tags
export async function updateTags(tags: RufasTag[]): Promise<void> {
  return writeJsonFile('tags.json', tags)
}

// Simplified to just create the tag
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
// export async function getAllBundles(): Promise<RufasBundle[]> {
//   return readJsonFile<RufasBundle[]>('bundles.json')
// }

export async function getAllBundles(): Promise<RufasBundle[]> {
  const bundles = await readJsonFile<RufasBundle[]>('bundles.json')

  // Restore fileIds from lastExport if available
  return bundles.map((bundle) => ({
    ...bundle,
    fileIds:
      bundle.fileIds.length > 0
        ? bundle.fileIds // Use existing fileIds if not empty
        : bundle.lastExport?.fileIds || [], // Otherwise use lastExport.fileIds or empty array
  }))
}

// Update bundles
export async function updateBundles(bundles: RufasBundle[]): Promise<void> {
  return writeJsonFile('bundles.json', bundles)
}

// Simplified to just create the bundle
export async function createBundle(
  bundle: Omit<RufasBundle, 'id' | 'createdAt' | 'lastExport'>
): Promise<RufasBundle> {
  const [existingBundles, files] = await Promise.all([
    getAllBundles(),
    getAllFiles(),
  ])

  // Create the new bundle
  const newBundle: RufasBundle = {
    ...bundle,
    id: `b_${Date.now()}`,
    createdAt: Date.now(),
    lastExport: null,
  }

  // Update files.json with the new bundle relationship
  const updatedFiles = files.map((file) => {
    if (bundle.fileIds.includes(file.id)) {
      return {
        ...file,
        bundleIds: [...new Set([...file.bundleIds, newBundle.id])],
      }
    }
    return file
  })

  // Save both updates
  await Promise.all([
    updateBundles([...existingBundles, newBundle]),
    updateFiles(updatedFiles),
  ])

  return newBundle
}

// Simplified to just update the file's tags
export async function removeTagFromFile(
  tagId: string,
  filePath: string
): Promise<void> {
  try {
    const files = await getAllFiles()
    const updatedFiles = files.map((file) =>
      file.id === filePath
        ? { ...file, tagIds: file.tagIds.filter((id) => id !== tagId) }
        : file
    )
    await updateFiles(updatedFiles)
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

    // 2. Update files.json - preserve existing relationships for files that still exist
    const updatedFiles = currentFiles.map((newFile) => {
      const existingFile = existingFiles.find((f) => f.id === newFile.id)

      if (existingFile) {
        return {
          ...newFile,
          tagIds: existingFile.tagIds,
          bundleIds: existingFile.bundleIds,
        }
      }
      return {
        ...newFile,
        tagIds: [],
        bundleIds: [],
      }
    })

    // 3. Build maps of relationships from files.json
    const tagToFiles = new Map<string, Set<string>>()
    const bundleToFiles = new Map<string, Set<string>>()

    updatedFiles.forEach((file) => {
      // Map tag relationships
      file.tagIds.forEach((tagId) => {
        if (!tagToFiles.has(tagId)) {
          tagToFiles.set(tagId, new Set())
        }
        tagToFiles.get(tagId)!.add(file.id)
      })

      // Map bundle relationships
      file.bundleIds.forEach((bundleId) => {
        if (!bundleToFiles.has(bundleId)) {
          bundleToFiles.set(bundleId, new Set())
        }
        bundleToFiles.get(bundleId)!.add(file.id)
      })
    })

    // 4. Update tags.json to match relationships in files.json
    const updatedTags = tags.map((tag) => ({
      ...tag,
      fileIds: Array.from(tagToFiles.get(tag.id) || []),
    }))

    // 5. Update bundles.json to match relationships in files.json
    const updatedBundles = bundles.map((bundle) => ({
      ...bundle,
      fileIds: Array.from(bundleToFiles.get(bundle.id) || []),
      // A bundle is stale if any of its files have been removed
      status:
        bundle.fileIds.length !== (bundleToFiles.get(bundle.id)?.size || 0)
          ? ('stale' as const)
          : bundle.status,
    }))

    // 6. Write all updates in one atomic operation
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

////////////////////////////////////////
// bundle export time !!! yay

// In databaseOperations.ts

type BundleExportMetadata = {
  bundle: RufasBundle
  tags: RufasTag[]
  files: RufasFile[]
  dirHandle: FileSystemDirectoryHandle
}

// Add this helper function to handle nested paths
async function getFileHandleFromPath(
  rootHandle: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemFileHandle> {
  const parts = path.split('/')
  const fileName = parts.pop()
  if (!fileName) throw new Error('Invalid path')

  let currentHandle: FileSystemDirectoryHandle = rootHandle

  // Traverse the directory structure
  for (const part of parts) {
    if (part) {
      // Skip empty parts from leading/trailing slashes
      currentHandle = await currentHandle.getDirectoryHandle(part)
    }
  }

  return currentHandle.getFileHandle(fileName)
}

async function generateBundleContent(
  metadata: BundleExportMetadata
): Promise<string> {
  const { bundle, tags, files, dirHandle } = metadata
  const timestamp = new Date().toISOString()

  let content = `<?xml version="1.0" encoding="UTF-8"?>\n<rufas>\n`

  content += `<bundle_head>
  <title>${bundle.name}</title>
  <description>${bundle.description}</description>
  <created_at>${timestamp}</created_at>
  <bundle_id>${bundle.id}</bundle_id>
</bundle_head>\n\n`

  content += `<documents>\n`

  for (const fileId of bundle.fileIds) {
    try {
      const file = files.find((f) => f.id === fileId)
      if (!file) continue

      const fileTags = tags.filter((tag) => file.tagIds.includes(tag.id))

      const fileType = fileTags.find((tag) => tag.name === 'doc')
        ? 'doc'
        : fileTags.find((tag) => tag.name === 'issue')
        ? 'issue'
        : ''

      const fileExtension = fileId.split('.').pop() || ''

      const fileHandle = await getFileHandleFromPath(dirHandle, fileId)
      const fileBlob = await fileHandle.getFile()
      const fileContent = await fileBlob.text()

      const lastModified = new Date(file.lastModified).toISOString()

      content += `<document>
<source>${fileId}</source>
<document_metadata>
  ${fileType ? `<type>${fileType}</type>` : ''}
  <tags>
${fileTags.map((tag) => `    <tag>${tag.name}</tag>`).join('\n')}
  </tags>
  <last_modified>${lastModified}</last_modified>
  <file_type>${fileExtension}</file_type>
</document_metadata>
<content>${fileContent}</content>
</document>\n`
    } catch (error) {
      console.error(`Failed to process file ${fileId}:`, error)
      content += `<document>
<source>${fileId}</source>
<error>Failed to read file: ${error.message}</error>
</document>\n`
    }
  }

  content += `</documents>\n</rufas>`
  return content
}

export async function exportBundle(
  bundleId: string,
  dirHandle: FileSystemDirectoryHandle
): Promise<void> {
  try {
    // Get current state
    const [bundles, tags, files] = await Promise.all([
      getAllBundles(),
      getAllTags(),
      getAllFiles(),
    ])

    const bundle = bundles.find((b) => b.id === bundleId)
    if (!bundle) throw new Error('Bundle not found')

    // Generate and write the export file
    const content = await generateBundleContent({
      bundle,
      tags,
      files,
      dirHandle,
    })

    const bundlesDirHandle = await databaseDirHandle!.getDirectoryHandle(
      'bundles',
      { create: true }
    )

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${bundle.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')}-${timestamp}.xml`

    const fileHandle = await bundlesDirHandle.getFileHandle(filename, {
      create: true,
    })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()

    // Update files.json first - it's the source of truth
    const updatedFiles = files.map((file) => {
      const fileIsInBundle = bundle.fileIds.includes(file.id)
      const fileHasBundleId = file.bundleIds.includes(bundleId)

      if (fileIsInBundle && !fileHasBundleId) {
        // Add bundle ID if file is in bundle but doesn't have the ID
        return {
          ...file,
          bundleIds: [...file.bundleIds, bundleId],
        }
      }
      if (!fileIsInBundle && fileHasBundleId) {
        // Remove bundle ID if file is not in bundle but has the ID
        return {
          ...file,
          bundleIds: file.bundleIds.filter((id) => id !== bundleId),
        }
      }
      return file
    })

    // Update bundles.json with the export info
    const updatedBundles = bundles.map((b) =>
      b.id === bundleId
        ? {
            ...b,
            fileIds: bundle.fileIds, // Maintain fileIds
            lastExport: {
              timestamp: Date.now(),
              fileIds: [...bundle.fileIds], // Snapshot same as fileIds
            },
          }
        : b
    )

    // Save both updates
    await Promise.all([
      updateFiles(updatedFiles),
      updateBundles(updatedBundles),
    ])
  } catch (error) {
    console.error('Failed to export bundle:', error)
    throw error
  }
}
