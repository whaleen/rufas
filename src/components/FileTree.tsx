// src/components/FileTree.tsx
import { useMemo, useEffect, useState } from 'react'
import { ScrollArea } from "./ui/scroll-area"
import { TreeView, type TreeDataItem } from "./tree-view"
import { useFileSystemStore } from "../store/fileSystemStore"
import { File, Folder, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { type Entry } from "../utils/fileSystem"
import { getAllFiles, getAllTags, removeTagFromFile } from '../databaseOperations'
import { type RufasTag } from '../database'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"

export function FileTree() {
  const entries = useFileSystemStore(state => state.entries)
  const selectedFiles = useFileSystemStore(state => state.selectedFiles)
  const setSelectedFiles = useFileSystemStore(state => state.setSelectedFiles)
  const [tagsByFile, setTagsByFile] = useState<Record<string, RufasTag[]>>({})
  const [expandAll, setExpandAll] = useState(false)
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<RufasTag[]>([])

  // Load files and their tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const [files, tags] = await Promise.all([getAllFiles(), getAllTags()])
        setAvailableTags(tags)
        const tagMap: Record<string, RufasTag[]> = {}

        files.forEach(file => {
          tagMap[file.id] = file.tagIds
            .map(tagId => tags.find(t => t.id === tagId))
            .filter((tag): tag is RufasTag => tag !== undefined)
        })

        setTagsByFile(tagMap)
      } catch (error) {
        console.error('Failed to load tags:', error)
      }
    }

    loadTags()
  }, [entries])

  const TagDots = ({ filePath }: { filePath: string }) => {
    const tags = tagsByFile[filePath] || []

    const handleRemoveTag = async (tagId: string, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      try {
        await removeTagFromFile(tagId, filePath)
        // Reload tags after removal
        const [files, allTags] = await Promise.all([getAllFiles(), getAllTags()])
        const newTagMap: Record<string, RufasTag[]> = {}
        files.forEach(file => {
          newTagMap[file.id] = file.tagIds
            .map(tagId => allTags.find(t => t.id === tagId))
            .filter((tag): tag is RufasTag => tag !== undefined)
        })
        setTagsByFile(newTagMap)
      } catch (error) {
        console.error('Failed to remove tag:', error)
      }
    }

    return (
      <div className="flex gap-1 items-center ml-2" onClick={e => e.stopPropagation()}>
        <TooltipProvider>
          {tags.map((tag) => (
            <Tooltip key={tag.id} delayDuration={50}>
              <TooltipTrigger asChild onClick={e => e.preventDefault()}>
                <button
                  className="w-2 h-2 rounded-full shrink-0 cursor-pointer border-0 p-0"
                  style={{ backgroundColor: tag.color }}
                  onClick={(e) => handleRemoveTag(tag.id, e)}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>Click to remove <span className="font-medium">{tag.name}</span></p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    )
  }

  const handleFilterChange = async (tagIds: string[]) => {
    setActiveTagFilters(tagIds)

    if (tagIds.length === 0) {
      setSelectedFiles([])
      return
    }

    try {
      const files = await getAllFiles()
      const filteredFiles = files.filter(file =>
        tagIds.some(tagId => file.tagIds.includes(tagId))
      )
      setSelectedFiles(filteredFiles.map(f => f.id))
    } catch (error) {
      console.error('Failed to filter files:', error)
    }
  }

  const treeData = useMemo(() => {
    const convertEntryToTreeItem = (entry: Entry, parentPath: string = ''): TreeDataItem => {
      const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name

      return {
        id: fullPath,
        name: entry.name,
        icon: entry.type === 'file' ? File : Folder,
        children: entry.children?.map(child =>
          convertEntryToTreeItem(child, fullPath)
        ),
        name: entry.type === 'file' ? (
          <div className="flex items-center justify-between w-full">
            <span>{entry.name}</span>
            <TagDots filePath={fullPath} />
          </div>
        ) : entry.name
      }
    }

    return entries.map(entry => convertEntryToTreeItem(entry))
  }, [entries, tagsByFile])

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      <div className="flex items-center gap-2 p-2 px-4 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={activeTagFilters.length > 0 ? 'text-primary' : undefined}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {availableTags.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground text-center">
                No tags created yet
              </div>
            ) : (
              availableTags.map(tag => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={activeTagFilters.includes(tag.id)}
                  onCheckedChange={() => {
                    const newSelection = activeTagFilters.includes(tag.id)
                      ? activeTagFilters.filter(id => id !== tag.id)
                      : [...activeTagFilters, tag.id]
                    handleFilterChange(newSelection)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setExpandAll(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-3 w-3 inline" /> Expand
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            onClick={() => setExpandAll(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-3 w-3 inline" /> Collapse
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="flex-grow overflow-hidden px-4 py-2">
          <ScrollArea className="h-full">
            <TreeView
              key={expandAll ? 'expanded' : 'collapsed'} // force remount
              data={treeData}
              defaultLeafIcon={File}
              defaultNodeIcon={Folder}
              expandAll={expandAll}
              selectedItems={selectedFiles}
              onSelectChange={setSelectedFiles}
            />
          </ScrollArea>
        </div>
      )}

      <div className="p-4 border-t bg-background">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Selected Files</h2>
          {activeTagFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFilterChange([])}
              className="text-xs"
            >
              Clear Filters
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
  )
}
