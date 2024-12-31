// store/fileSystemStore.ts
import { create } from 'zustand'
import { type Entry, getDirectoryContents } from '../utils/fileSystem'
import { FILE_SYSTEM_CONFIG } from '../config'
import {
  initializeDatabase,
  updateFiles,
  getAllFiles,
  initializeDatabaseDir,
  synchronizeDatabase,
} from '../databaseOperations'
import { type RufasFile } from '../database'

// Helper function to get a file handle from a path
async function getFileHandleFromPath(
  rootHandle: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemFileHandle> {
  const parts = path.split('/')
  const fileName = parts.pop()
  if (!fileName) throw new Error('Invalid path')

  let currentHandle: FileSystemDirectoryHandle = rootHandle
  for (const part of parts) {
    if (part) {
      currentHandle = await currentHandle.getDirectoryHandle(part)
    }
  }
  return currentHandle.getFileHandle(fileName)
}

// Modified to not set lastModified
const getAllFileEntries = async (
  dirHandle: FileSystemDirectoryHandle,
  entries: Entry[]
): Promise<RufasFile[]> => {
  const files: RufasFile[] = []

  const processEntry = async (entry: Entry, parentPath: string = '') => {
    const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name

    if (entry.type === 'file') {
      try {
        const fileHandle = await getFileHandleFromPath(dirHandle, fullPath)
        const fileObj = await fileHandle.getFile()

        files.push({
          id: fullPath,
          path: fullPath,
          tagIds: [],
          bundleIds: [],
          lastModified: fileObj.lastModified,
        })
      } catch (error) {
        console.error(`Error processing file ${fullPath}:`, error)
      }
    }

    for (const child of entry.children || []) {
      await processEntry(child, fullPath)
    }
  }

  for (const entry of entries) {
    await processEntry(entry)
  }

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
  selectedFiles: string[]
  isInitialized: () => boolean
  openFolder: () => Promise<void>
  closeFolder: () => void
  refreshContents: () => Promise<void>
  setPolling: (enabled: boolean) => void
  setSelectedFiles: (files: string[]) => void
  toggleFileSelection: (filePath: string) => void
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  entries: [],
  dirHandle: null,
  isPolling: FILE_SYSTEM_CONFIG.polling.enabled,
  initialized: false,
  selectedFiles: [],

  isInitialized: () => get().initialized,

  setSelectedFiles: (files) => {
    set({ selectedFiles: files })
  },

  toggleFileSelection: (filePath) => {
    const currentSelected = get().selectedFiles
    const isSelected = currentSelected.includes(filePath)

    if (isSelected) {
      set({ selectedFiles: currentSelected.filter((f) => f !== filePath) })
    } else {
      set({ selectedFiles: [...currentSelected, filePath] })
    }
  },

  openFolder: async () => {
    try {
      const dirHandle = await window.showDirectoryPicker()
      const entries = await getDirectoryContents(dirHandle)

      // Check if .rufas directory already exists
      const hasRufas = await checkIfRufasExists(dirHandle)

      if (!hasRufas) {
        console.log('Initializing new .rufas directory')
        await initializeDatabase(dirHandle)
        const initialFiles = await getAllFileEntries(dirHandle, entries)
        await updateFiles(initialFiles)
      } else {
        console.log('Found existing 🦘 .rufas directory')
        await initializeDatabaseDir(dirHandle)

        // Update file registry with current files
        const currentFiles = await getAllFileEntries(dirHandle, entries)
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
    set({
      dirHandle: null,
      entries: [],
      initialized: false,
      selectedFiles: [],
    })
  },

  refreshContents: async () => {
    const { dirHandle, isPolling } = get()
    if (!dirHandle) return

    try {
      // Get current state of the filesystem
      const entries = await getDirectoryContents(dirHandle)
      const currentFiles = await getAllFileEntries(dirHandle, entries)
      const existingFiles = await getAllFiles()

      // Merge current files with existing files, preserving relationships
      const updatedFiles = currentFiles.map((currentFile) => {
        const existingFile = existingFiles.find((f) => f.id === currentFile.id)
        if (
          existingFile &&
          existingFile.lastModified === currentFile.lastModified
        ) {
          // File hasn't changed, keep existing data
          return existingFile
        } else {
          // File is new or modified, use new lastModified but preserve relationships
          return {
            ...currentFile,
            tagIds: existingFile?.tagIds || [],
            bundleIds: existingFile?.bundleIds || [],
          }
        }
      })

      // Synchronize database and update UI
      await synchronizeDatabase(updatedFiles)
      set({ entries })

      // Schedule next poll if needed
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
