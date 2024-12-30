// src/contexts/FileSystemContext.tsx
import { createContext, useContext, ReactNode } from 'react'
import { useFileSystemStore } from '../store/fileSystemStore'

interface FileSystemContextType {
  initialized: boolean
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined)

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const initialized = useFileSystemStore(state => state.initialized)

  return (
    <FileSystemContext.Provider value={{ initialized }}>
      {children}
    </FileSystemContext.Provider>
  )
}

export function useFileSystem() {
  const context = useContext(FileSystemContext)
  if (context === undefined) {
    throw new Error('useFileSystem must be used within a FileSystemProvider')
  }
  return context
}
