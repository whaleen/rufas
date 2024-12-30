// src/components/FileTreeControls.tsx
import { useState } from 'react'
import { Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { getAllTags } from '../databaseOperations'
import { type RufasTag } from '../database'

interface FileTreeControlsProps {
  onExpandAll: () => void
  onCollapseAll: () => void
  onFilterChange: (tagIds: string[]) => void
}

export function FileTreeControls({
  onExpandAll,
  onCollapseAll,
  onFilterChange
}: FileTreeControlsProps) {
  const [tags, setTags] = useState<RufasTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Load tags when filter opens
  const handleFilterOpen = async () => {
    try {
      const loadedTags = await getAllTags()
      setTags(loadedTags)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const handleTagSelect = (tagId: string) => {
    const newSelection = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId]

    setSelectedTags(newSelection)
    onFilterChange(newSelection)
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <DropdownMenu onOpenChange={(open) => open && handleFilterOpen()}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={selectedTags.length > 0 ? 'text-primary' : undefined}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {tags.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground text-center">
              No tags created yet
            </div>
          ) : (
            tags.map(tag => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={selectedTags.includes(tag.id)}
                onCheckedChange={() => handleTagSelect(tag.id)}
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
          onClick={onExpandAll}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="h-3 w-3 inline" /> Expand
        </button>
        <span className="text-muted-foreground">/</span>
        <button
          onClick={onCollapseAll}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-3 w-3 inline" /> Collapse
        </button>
      </div>
    </div>
  )
}
