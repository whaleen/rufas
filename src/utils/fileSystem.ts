// utils/fileSystem.ts
import { shouldIgnore } from '../config'

// Keep our internal type for processing
export type Entry = {
  name: string
  type: 'file' | 'directory'
  children?: Entry[]
}

export async function getDirectoryContents(
  dir: FileSystemDirectoryHandle | null
): Promise<Entry[]> {
  if (!dir) {
    return []
  }

  const entries: Entry[] = []

  try {
    for await (const entry of dir.values()) {
      if (shouldIgnore(entry.name)) {
        continue
      }

      if (entry.kind === 'file') {
        entries.push({
          name: entry.name,
          type: 'file',
        })
      } else {
        const subDir = entry as FileSystemDirectoryHandle
        const children = await getDirectoryContents(subDir)
        entries.push({
          name: entry.name,
          type: 'directory',
          children,
        })
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error)
    return []
  }

  return entries.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name)
    }
    return a.type === 'directory' ? -1 : 1
  })
}
