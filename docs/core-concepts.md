# Core Concepts

## Source of Truth: files.json

- `files.json` is THE source of truth for all relationships
- Files maintain their own `tagIds` and `bundleIds`
- When in doubt, trust what's in `files.json`
- Never write to `tags.json` or `bundles.json` without also updating `files.json`

## Relationship Management

### Bi-directional Relationships

Rufas maintains bi-directional relationships between files and their associated entities (tags and bundles). These relationships must be kept in sync:

```typescript
// In files.json
{
  "id": "src/config.ts",
  "bundleIds": ["b_123", "b_456"]  // File knows its bundles
}

// In bundles.json
{
  "id": "b_123",
  "fileIds": ["src/config.ts", ...]  // Bundle knows its files
}
```

### Relationship Integrity Rules

1. **Synchronization Rule**: Every relationship must exist in both directions

   - If a file claims to be in a bundle, that bundle must list the file
   - If a bundle claims to have a file, that file must reference the bundle

2. **Source of Truth Rule**: When conflicts occur, `files.json` wins

   - If a bundle lists a file but the file doesn't reference the bundle, remove it from the bundle
   - If a file references a bundle but isn't listed in the bundle, add it to the bundle

3. **Atomic Updates Rule**: Always update both sides of a relationship together
   ```typescript
   await Promise.all([updateFiles(updatedFiles), updateBundles(updatedBundles)])
   ```

## State Management

### Core State Flow

```
1. Filesystem Changes → 2. Update files.json → 3. Sync to derived state
```

1. **Filesystem Changes**

   - New files discovered
   - Files deleted
   - Files modified

2. **Update files.json**

   - Add/remove file entries
   - Preserve existing relationships
   - Update metadata (lastModified, etc.)

3. **Sync to Derived State**
   - Update tags.json based on file relationships
   - Update bundles.json based on file relationships
   - Never sync in the opposite direction

### Export State Management

When exporting bundles:

1. **Current State** (`fileIds`)

   - Represents active relationships
   - Must match relationships in files.json
   - Used for UI display and operations

2. **Export State** (`lastExport`)
   - Historical record of what was exported
   - Used for change detection
   - Should not be used as source of truth
   - Should mirror fileIds at export time

## Common Pitfalls

### Don't Trust lastExport for Relationships

```typescript
// WRONG: Restoring relationships from lastExport
const bundle = {
  ...oldBundle,
  fileIds: oldBundle.lastExport.fileIds,
}

// CORRECT: Build relationships from files.json
const fileIdsFromFiles = files
  .filter((f) => f.bundleIds.includes(bundleId))
  .map((f) => f.id)
```

### Don't Update Derived State Directly

```typescript
// WRONG: Updating bundle without updating files
await updateBundles([{ ...bundle, fileIds: [...bundle.fileIds, newFileId] }])

// CORRECT: Update files first, then sync
await updateFiles(
  files.map((f) =>
    f.id === newFileId ? { ...f, bundleIds: [...f.bundleIds, bundleId] } : f
  )
)
await synchronizeDatabase(files)
```

### Don't Forget to Update Both Sides

```typescript
// WRONG: Only updating the bundle
bundle.fileIds = [...bundle.fileIds, newFileId]

// CORRECT: Update both sides atomically
const updatedFiles = files.map((f) =>
  f.id === newFileId ? { ...f, bundleIds: [...f.bundleIds, bundleId] } : f
)
const updatedBundles = bundles.map((b) =>
  b.id === bundleId ? { ...b, fileIds: [...b.fileIds, newFileId] } : b
)
await Promise.all([updateFiles(updatedFiles), updateBundles(updatedBundles)])
```

## Database Operations Rules

### Creating Relationships

```typescript
// CORRECT
async function addBundleToFiles(bundleId: string, fileIds: string[]) {
  // 1. Start with files (source of truth)
  const files = await getAllFiles()
  const updatedFiles = files.map((file) => {
    if (fileIds.includes(file.id)) {
      return {
        ...file,
        bundleIds: [...new Set([...file.bundleIds, bundleId])],
      }
    }
    return file
  })

  // 2. Update files first
  await updateFiles(updatedFiles)

  // 3. Let synchronizeDatabase handle the rest
  await synchronizeDatabase(updatedFiles)
}
```

### Removing Relationships

```typescript
// CORRECT
async function removeBundleFromFiles(bundleId: string) {
  // 1. Start with files (source of truth)
  const files = await getAllFiles()
  const updatedFiles = files.map((file) => ({
    ...file,
    bundleIds: file.bundleIds.filter((id) => id !== bundleId),
  }))

  // 2. Update files first
  await updateFiles(updatedFiles)

  // 3. Let synchronizeDatabase clean up derived state
  await synchronizeDatabase(updatedFiles)
}
```

## Testing Relationship Integrity

You can verify relationship integrity with this check:

```typescript
async function checkRelationshipIntegrity() {
  const [files, bundles] = await Promise.all([getAllFiles(), getAllBundles()])

  // Check each direction
  const errors = []

  // Check files → bundles
  files.forEach((file) => {
    file.bundleIds.forEach((bundleId) => {
      const bundle = bundles.find((b) => b.id === bundleId)
      if (!bundle) {
        errors.push(
          `File ${file.id} references non-existent bundle ${bundleId}`
        )
      } else if (!bundle.fileIds.includes(file.id)) {
        errors.push(
          `File ${file.id} claims to be in bundle ${bundleId} but isn't`
        )
      }
    })
  })

  // Check bundles → files
  bundles.forEach((bundle) => {
    bundle.fileIds.forEach((fileId) => {
      const file = files.find((f) => f.id === fileId)
      if (!file) {
        errors.push(
          `Bundle ${bundle.id} references non-existent file ${fileId}`
        )
      } else if (!file.bundleIds.includes(bundle.id)) {
        errors.push(
          `Bundle ${bundle.id} claims file ${fileId} but file doesn't agree`
        )
      }
    })
  })

  return errors
}
```

## Future Development

When adding new features:

1. Always start with how it affects `files.json`
2. Ensure bi-directional relationships are maintained
3. Update files.json first, then sync derived state
4. Never bypass the synchronization pattern
5. Add integrity checks for new relationship types

Remember: The health of the entire system depends on maintaining accurate relationships in files.json.
