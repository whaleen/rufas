// store/fileSystemStore.ts
import { create } from 'zustand'
import { type Entry, getDirectoryContents } from '../utils/fileSystem'
import { FILE_SYSTEM_CONFIG } from '../config'
import {
  initializeDatabase,
  updateFiles,
  getAllFiles,
  initializeDatabaseDir,
} from '../databaseOperations'
import { type RufasFile } from '../database'

const getAllFileEntries = (entries: Entry[]): RufasFile[] => {
  const files: RufasFile[] = []

  const processEntry = (entry: Entry, parentPath: string = '') => {
    const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name

    if (entry.type === 'file') {
      files.push({
        id: fullPath,
        path: fullPath,
        tagIds: [],
        bundleIds: [],
        lastModified: Date.now(),
      })
    }

    entry.children?.forEach((child) => processEntry(child, fullPath))
  }

  entries.forEach((entry) => processEntry(entry))
  return files
}

async function checkIfRufasExists(
  dirHandle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    await dirHandle.getDirectoryHandle('.rufas', { create: false })
    return true
  } catch (error) {
    console.error('.rufas directory not found:', error)
    return false
  }
}

interface FileSystemState {
  entries: Entry[]
  dirHandle: FileSystemDirectoryHandle | null
  isPolling: boolean
  initialized: boolean
  isInitialized: () => boolean
  openFolder: () => Promise<void>
  closeFolder: () => void
  refreshContents: () => Promise<void>
  setPolling: (enabled: boolean) => void
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  entries: [],
  dirHandle: null,
  isPolling: FILE_SYSTEM_CONFIG.polling.enabled,
  initialized: false,

  isInitialized: () => get().initialized,

  openFolder: async () => {
    try {
      const dirHandle = await window.showDirectoryPicker()
      const entries = await getDirectoryContents(dirHandle)

      // Check if .rufas directory already exists
      const hasRufas = await checkIfRufasExists(dirHandle)

      if (!hasRufas) {
        // Only initialize if .rufas doesn't exist
        console.log('Initializing new .rufas directory')
        await initializeDatabase(dirHandle)
        const initialFiles = getAllFileEntries(entries)
        await updateFiles(initialFiles)
      } else {
        // If .rufas exists, just ensure the directory structure is valid
        console.log('Found existing .rufas directory')
        await initializeDatabaseDir(dirHandle)

        // Update file registry with current files
        const currentFiles = getAllFileEntries(entries)
        const existingFiles = await getAllFiles()

        // Merge existing files with current files, preserving tags and bundles
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

        await updateFiles(updatedFiles)
      }

      set({ dirHandle, entries, initialized: true })

      if (get().isPolling) {
        get().refreshContents()
      }
    } catch (err) {
      console.error('Failed to open directory:', err)
      set({ dirHandle: null, entries: [], initialized: false })
    }
  },

  closeFolder: () => {
    set({ dirHandle: null, entries: [], initialized: false })
  },

  refreshContents: async () => {
    const { dirHandle, isPolling } = get()
    if (!dirHandle) return

    try {
      const entries = await getDirectoryContents(dirHandle)
      const currentFiles = getAllFileEntries(entries)

      // Get existing files from database
      const databaseFiles = await getAllFiles()

      // Create sets of paths for comparison
      const currentPaths = new Set(currentFiles.map((f) => f.path))
      const databasePaths = new Set(databaseFiles.map((f) => f.path))

      // Find new files
      const newFiles = currentFiles.filter((f) => !databasePaths.has(f.path))

      // Keep existing files that weren't removed, preserving their metadata
      const keptFiles = databaseFiles
        .filter((f) => currentPaths.has(f.path))
        .map((existingFile) => {
          const currentFile = currentFiles.find(
            (f) => f.path === existingFile.path
          )
          return {
            ...existingFile,
            lastModified:
              currentFile?.lastModified ?? existingFile.lastModified,
          }
        })

      // Combine kept files with new files
      const updatedFiles = [...keptFiles, ...newFiles]

      // Update database
      await updateFiles(updatedFiles)

      set({ entries })

      if (isPolling) {
        setTimeout(get().refreshContents, FILE_SYSTEM_CONFIG.polling.intervalMs)
      }
    } catch (err) {
      console.error('Failed to refresh directory:', err)
      set({ dirHandle: null, entries: [], initialized: false })
    }
  },

  setPolling: (enabled) => {
    set({ isPolling: enabled })
    if (enabled && get().dirHandle) {
      get().refreshContents()
    }
  },
}))
