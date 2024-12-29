// src/components/TagManagement.tsx
import { useState, useEffect } from 'react'
import { Plus, X, Edit2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createTag, getAllTags, updateTags } from '../databaseOperations'
import { type RufasTag } from '../database'
import { useFileSystemStore } from '../store/fileSystemStore'


export function TagManagement() {
  const [tags, setTags] = useState<RufasTag[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<RufasTag | null>(null)
  const [error, setError] = useState<string | null>(null)
  const initialized = useFileSystemStore(state => state.initialized)
  const [newTag, setNewTag] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  })

  useEffect(() => {
    if (initialized) {
      loadTags()
    }
  }, [initialized]) // Re-run when initialized changes

  const loadTags = async () => {
    try {
      const loadedTags = await getAllTags()
      setTags(loadedTags)
      setError(null)
    } catch (error) {
      setError('Failed to load tags')
      console.error('Failed to load tags:', error)
    }
  }

  const validateTag = (tag: typeof newTag) => {
    if (!tag.name.trim()) {
      throw new Error('Tag name is required')
    }
    if (tag.name.length > 50) {
      throw new Error('Tag name must be less than 50 characters')
    }
    if (tag.description.length > 200) {
      throw new Error('Description must be less than 200 characters')
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(tag.color)) {
      throw new Error('Invalid color format')
    }
  }

  const handleCreateTag = async () => {
    try {
      validateTag(newTag)

      await createTag({
        name: newTag.name,
        description: newTag.description,
        color: newTag.color,
        fileIds: []
      })

      setNewTag({ name: '', description: '', color: '#3B82F6' })
      setIsCreateOpen(false)
      setError(null)
      await loadTags()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create tag')
    }
  }

  const handleDeleteTag = async (tag: RufasTag) => {
    try {
      const updatedTags = tags.filter(t => t.id !== tag.id)
      await updateTags(updatedTags)
      setIsDeleteOpen(false)
      setSelectedTag(null)
      await loadTags()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      setError('Failed to delete tag')
    }
  }

  const handleEditTag = async (tag: RufasTag) => {
    try {
      validateTag(tag)

      const updatedTags = tags.map(t =>
        t.id === tag.id ? tag : t
      )
      await updateTags(updatedTags)
      setIsEditOpen(false)
      setSelectedTag(null)
      await loadTags()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update tag')
    }
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tags</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a new tag to help organize your files.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  className="col-span-3"
                  maxLength={50}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input
                  id="description"
                  value={newTag.description}
                  onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                  className="col-span-3"
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color" className="text-right">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  className="col-span-3 h-10 p-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTag}>Create Tag</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Modify the tag properties.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {selectedTag && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input
                  id="edit-name"
                  value={selectedTag.name}
                  onChange={(e) => setSelectedTag({ ...selectedTag, name: e.target.value })}
                  className="col-span-3"
                  maxLength={50}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">Description</Label>
                <Input
                  id="edit-description"
                  value={selectedTag.description}
                  onChange={(e) => setSelectedTag({ ...selectedTag, description: e.target.value })}
                  className="col-span-3"
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-color" className="text-right">Color</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={selectedTag.color}
                  onChange={(e) => setSelectedTag({ ...selectedTag, color: e.target.value })}
                  className="col-span-3 h-10 p-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => selectedTag && handleEditTag(selectedTag)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tag? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedTag && handleDeleteTag(selectedTag)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing Tags */}
      <div className="space-y-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags created yet</p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-2 rounded-md border"
              style={{ borderLeftColor: tag.color, borderLeftWidth: '4px' }}
            >
              <div className="flex-grow">
                <p className="font-medium">{tag.name}</p>
                {tag.description && (
                  <p className="text-sm text-muted-foreground">{tag.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedTag(tag)
                    setIsEditOpen(true)
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedTag(tag)
                    setIsDeleteOpen(true)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TagManagement
