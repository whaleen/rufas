// src/App.tsx
import React from 'react'
import { Button } from "./components/ui/button"
import { useFileSystemStore } from "./store/fileSystemStore"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from './components/mode-toggle'
import TagManagement from './components/TagManagement'
import BundleManagement from './components/BundleManagement'
import { FileTree } from './components/FileTree'
import { FileSystemProvider } from './contexts/FileSystemContext'
import { useFileSystem } from './contexts/FileSystemContext'
import { FolderOpen, ChevronDown, X } from 'lucide-react'
import HeartbeatIndicator from './components/HeartbeatIndicator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// import DatabaseView from './components/DatabaseView'
// import Chat from './components/Chat'

const FolderButton = ({ openFolder, closeFolder }: {
  openFolder: () => Promise<void>,
  closeFolder: () => void
}) => {
  const dirHandle = useFileSystemStore(state => state.dirHandle)

  // If no folder is selected, show simple Open button
  if (!dirHandle) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={openFolder}
        className="gap-2"
      >
        <FolderOpen className="h-4 w-4" />
        Open Folder
      </Button>
    )
  }

  // Show folder name with dropdown when folder is selected
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="truncate max-w-[200px]">{dirHandle.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={openFolder}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Change Folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={closeFolder} className="text-destructive focus:text-destructive">
          <X className="h-4 w-4 mr-2" />
          Close Folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const MainContent = () => {
  const { openFolder, closeFolder } = useFileSystemStore()
  const { initialized } = useFileSystem()

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <div className="text-2xl font-medium mb-2 select-none">
            <pre className="font-mono inline-block">
              (\__/)<br />
              (o˘ᴗ˘o)
            </pre>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Rufas</h1>
          <p className="text-muted-foreground">
            Open a folder to start managing your files with tags and bundles
          </p>
          <FolderButton openFolder={openFolder} closeFolder={closeFolder} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[320px_480px_480px_480px_1280px] h-screen">
      <div className="border-r">
        <div className="flex gap-2 p-4 pb-0 items-center">
          <div className="text-xs select-none text-muted">
            &nbsp;&nbsp;(\__/)<br />
            (o˘ᴗ˘o)<br />
          </div>
          <FolderButton openFolder={openFolder} closeFolder={closeFolder} />
          <div className="flex-grow" />

          <ModeToggle />
        </div>

        <div className="flex items-center justify-between p-4">
          <HeartbeatIndicator />


        </div>


        <FileTree />

      </div>


      <div className="border-r px-8">
        <TagManagement />

      </div>

      <div className="border-r p-4">
        {/* <Chat /> */}
        <BundleManagement />
        {/* <DatabaseView /> */}

      </div>

      <div className="border-r p-4">
        {/* <Chat /> */}
        {/* <BundleManagement /> */}
        {/* <DatabaseView /> */}
      </div>

      <div className="border-r p-4">
        {/* <Chat /> */}
        {/* <BundleManagement /> */}
        {/* <DatabaseView /> */}
      </div>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <FileSystemProvider>
        <MainContent />
      </FileSystemProvider>
    </ThemeProvider>
  )
}

export default App
