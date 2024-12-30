Ah yes, this is a great point about renames - you're absolutely right that from the file system's perspective, a rename operation appears as a deletion + creation since we can't track the identity of the file across the rename.

Let's look at how we're currently handling these operations and what we need to improve:

1. First, let's examine where file changes are detected. In `fileSystemStore.ts`, during the `refreshContents` polling:

```typescript
// Current implementation
const currentFiles = getAllFileEntries(entries)
const databaseFiles = await getAllFiles()
const currentPaths = new Set(currentFiles.map((f) => f.path))
const databasePaths = new Set(databaseFiles.map((f) => f.path))
const newFiles = currentFiles.filter((f) => !databasePaths.has(f.path))
const keptFiles = databaseFiles.filter((f) => currentPaths.has(f.path))
```

This code identifies new and kept files, but doesn't explicitly handle deletions. We should add:

```typescript
// Find deleted files
const deletedPaths = Array.from(databasePaths).filter(
  (path) => !currentPaths.has(path)
)

// Handle deletions
for (const deletedPath of deletedPaths) {
  await cleanupDeletedFile(deletedPath)
}
```

2. For reference, here's what `cleanupDeletedFile` does in `databaseOperations.ts`:

```typescript
export async function cleanupDeletedFile(filePath: string): Promise<void> {
  try {
    const [tags, bundles] = await Promise.all([getAllTags(), getAllBundles()])

    // Remove file from tags
    const updatedTags = tags.map((tag) => ({
      ...tag,
      fileIds: tag.fileIds.filter((id) => id !== filePath),
    }))

    // Remove file from bundles and mark affected bundles as stale
    const updatedBundles = bundles.map((bundle) => ({
      ...bundle,
      fileIds: bundle.fileIds.filter((id) => id !== filePath),
      status: bundle.fileIds.includes(filePath)
        ? ('stale' as const)
        : bundle.status,
    }))

    await Promise.all([updateTags(updatedTags), updateBundles(updatedBundles)])
  } catch (error) {
    console.error('Failed to cleanup deleted file references:', error)
    throw error
  }
}
```

Let's modify the `refreshContents` function in `fileSystemStore.ts` to handle all these cases properly:

```typescript
refreshContents: async () => {
  const { dirHandle, isPolling } = get()
  if (!dirHandle) return

  try {
    const entries = await getDirectoryContents(dirHandle)
    const currentFiles = getAllFileEntries(entries)
    const databaseFiles = await getAllFiles()

    // Create sets for comparison
    const currentPaths = new Set(currentFiles.map((f) => f.path))
    const databasePaths = new Set(databaseFiles.map((f) => f.path))

    // 1. Handle Deletions (and implicitly, the "deletion" part of renames)
    const deletedPaths = Array.from(databasePaths).filter(
      (path) => !currentPaths.has(path)
    )

    for (const deletedPath of deletedPaths) {
      await cleanupDeletedFile(deletedPath)
    }

    // 2. Handle New Files (including the "new file" part of renames)
    const newFiles = currentFiles.filter((f) => !databasePaths.has(f.path))

    // 3. Handle Kept Files (update lastModified if needed)
    const keptFiles = databaseFiles
      .filter((f) => currentPaths.has(f.path))
      .map((existingFile) => {
        const currentFile = currentFiles.find(
          (f) => f.path === existingFile.path
        )
        return {
          ...existingFile,
          lastModified: currentFile?.lastModified ?? existingFile.lastModified,
        }
      })

    // Combine and update
    const updatedFiles = [...keptFiles, ...newFiles]
    await updateFiles(updatedFiles)

    set({ entries })

    if (isPolling) {
      setTimeout(get().refreshContents, FILE_SYSTEM_CONFIG.polling.intervalMs)
    }
  } catch (err) {
    console.error('Failed to refresh directory:', err)
    set({ dirHandle: null, entries: [], initialized: false })
  }
}
```

The key points about this implementation:

1. File Deletion

   - Detected when a path exists in database but not in current filesystem
   - Triggers `cleanupDeletedFile` which:
     - Removes the file's ID from all tags
     - Removes the file's ID from all bundles
     - Marks affected bundles as stale

2. New Files (including renamed files)

   - Detected when a path exists in filesystem but not in database
   - Added to files.json with fresh metadata
   - No tags or bundles initially

3. Kept Files
   - Files that exist in both places
   - Preserves their existing tags and bundles
   - Updates lastModified if changed

This approach handles all cases correctly, even though we can't explicitly detect renames. A rename will be handled as:

1. Original file path: handled by deletion cleanup
2. New file path: handled as a new file
3. Result: Clean database state with no orphaned references

Would you like me to elaborate on any part of this implementation or discuss any other aspects of the file operation handling?
