// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Button } from "./components/ui/button"
import { ScrollArea } from "./components/ui/scroll-area"
import { TreeView, type TreeDataItem } from "./components/tree-view"
import { useFileSystemStore } from "./store/fileSystemStore"
import { type Entry } from "./utils/fileSystem"
import { File, Folder, Package } from 'lucide-react'
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from './components/mode-toggle'
import TagManagement from './components/TagManagement'
import BundleManagement from './components/BundleManagement'

const App: React.FC = () => {
  const { entries, openFolder, closeFolder } = useFileSystemStore()
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const initialized = useFileSystemStore(state => state.initialized)

  useEffect(() => {
    if (initialized) {
      console.log('Database initialized')
    }
    else {
      console.log('Database not initialized')
    }
  }, [initialized]) // Re-run when initialized changes

  const treeData = useMemo(() => {
    const convertEntryToTreeItem = (entry: Entry, parentPath: string = ''): TreeDataItem => {
      const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name

      return {
        id: fullPath,  // Use full path as ID
        name: entry.name,  // Keep displaying just the name
        icon: entry.type === 'file' ? File : Folder,
        children: entry.children?.map(child =>
          convertEntryToTreeItem(child, fullPath)
        ),
        onClick: () => {
          if (selectedItems.includes(fullPath)) {
            setSelectedItems(selectedItems.filter(id => id !== fullPath))
          } else {
            setSelectedItems([...selectedItems, fullPath])
          }
        }
      }
    }

    return entries.map(entry => convertEntryToTreeItem(entry))
  }, [entries, selectedItems])

  // Filter to only show selected files
  const selectedFiles = useMemo(() => {
    const findSelectedFiles = (entries: Entry[], parentPath: string = ''): string[] => {
      return entries.flatMap(entry => {
        const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name

        if (entry.type === 'file' && selectedItems.includes(fullPath)) {
          return [fullPath];
        }
        return entry.children ? findSelectedFiles(entry.children, fullPath) : [];
      });
    };

    return findSelectedFiles(entries);
  }, [entries, selectedItems])

  const bundleSelectedItems = (selectedFiles: string[]) => {
    console.log('bundleSelectedItems', selectedFiles)
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">

      <div className="grid grid-cols-[300px_1fr] h-screen">
        <div className="border-r">
          <div className="flex flex-col h-screen max-w-md mx-auto">
            <div className="flex gap-2 p-4 pb-0">
              <Button onClick={openFolder}>Open Folder</Button>
              <Button onClick={closeFolder}>Close Folder</Button>
              <ModeToggle />
            </div>

            {entries.length > 0 && (
              <div className="flex-grow overflow-hidden px-4 py-2">
                <ScrollArea className="h-full">
                  <TreeView
                    data={treeData}
                    defaultLeafIcon={File}
                    defaultNodeIcon={Folder}
                    expandAll
                    selectedItems={selectedItems}
                    onSelectChange={setSelectedItems}
                  />
                </ScrollArea>
              </div>
            )}

            <div className="p-4 border-t bg-background">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Selected Files</h2>
                {selectedFiles.length > 0 && (
                  <Button
                    onClick={() => bundleSelectedItems(selectedFiles)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Bundle ({selectedFiles.length})
                  </Button>
                )}
              </div>
              {selectedFiles.length > 0 ? (
                <ul className="list-disc pl-5 max-h-32 overflow-auto">
                  {selectedFiles.map((name) => (
                    <li key={name} className="text-sm">{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No files selected</p>
              )}
            </div>

          </div>
        </div>
        {/* main  */}
        <div className="">
          <TagManagement />
          <BundleManagement
            selectedFiles={selectedFiles}
          />
        </div>

      </div>
    </ThemeProvider>
  )
}

export default App
