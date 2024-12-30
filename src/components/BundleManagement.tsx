// src/components/BundleManagement.tsx
import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Package, RefreshCcw } from 'lucide-react'
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  createBundle,
  getAllBundles,
  updateBundles
} from '../databaseOperations'
import { type RufasBundle } from '../database'
import { useFileSystem } from '../contexts/FileSystemContext'
import { useFileSystemStore } from '../store/fileSystemStore'

export function BundleManagement() {
  const selectedFiles = useFileSystemStore(state => state.selectedFiles)
  const [bundles, setBundles] = useState<RufasBundle[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState<RufasBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { initialized } = useFileSystem()
  const [newBundle, setNewBundle] = useState({
    name: '',
    description: '',
    isMaster: false
  })
  const dirHandle = useFileSystemStore(state => state.dirHandle) // Add this

  useEffect(() => {
    // Clear state when folder changes
    if (!dirHandle) {
      setBundles([])
      setSelectedBundle(null)
      setError(null)
      setIsCreateOpen(false)
      setIsDeleteOpen(false)
      setIsEditOpen(false)
      return
    }

    // Load bundles when a folder is selected
    loadBundles()
  }, [dirHandle]) // React to folder changes

  useEffect(() => {
    if (initialized) {
      loadBundles()
    }
  }, [initialized]) // Re-run when initialized changes

  const loadBundles = async () => {
    try {
      const loadedBundles = await getAllBundles()
      setBundles(loadedBundles)
      setError(null)
    } catch (error) {
      setError('Failed to load bundles')
      console.error('Failed to load bundles:', error)
    }
  }

  const validateBundle = (bundle: typeof newBundle) => {
    if (!bundle.name.trim()) {
      throw new Error('Bundle name is required')
    }
    if (bundle.name.length > 50) {
      throw new Error('Bundle name must be less than 50 characters')
    }
    if (bundle.description.length > 200) {
      throw new Error('Description must be less than 200 characters')
    }
  }

  const handleCreateBundle = async () => {
    try {
      validateBundle(newBundle)

      if (selectedFiles.length === 0) {
        throw new Error('Please select files to create a bundle')
      }

      await createBundle({
        name: newBundle.name,
        description: newBundle.description,
        isMaster: newBundle.isMaster,
        fileIds: selectedFiles
      })

      setNewBundle({ name: '', description: '', isMaster: false })
      setIsCreateOpen(false)
      setError(null)
      await loadBundles()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create bundle')
    }
  }

  const handleDeleteBundle = async (bundle: RufasBundle) => {
    try {
      const updatedBundles = bundles.filter(b => b.id !== bundle.id)
      await updateBundles(updatedBundles)
      setIsDeleteOpen(false)
      setSelectedBundle(null)
      await loadBundles()
    } catch (error) {
      console.error('Failed to delete bundle:', error)
      setError('Failed to delete bundle')
    }
  }

  const handleEditBundle = async (bundle: RufasBundle) => {
    try {
      validateBundle(bundle)

      const updatedBundles = bundles.map(b =>
        b.id === bundle.id ? {
          ...bundle,
          lastBundled: Date.now(),
          status: 'fresh' as const  // or 'fresh' as RufasBundle['status']
        } : b
      )
      await updateBundles(updatedBundles)
      setIsEditOpen(false)
      setSelectedBundle(null)
      await loadBundles()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update bundle')
    }
  }

  const handleRefreshBundle = async (bundle: RufasBundle) => {
    try {
      const updatedBundles = bundles.map(b =>
        b.id === bundle.id ? {
          ...bundle,
          lastBundled: Date.now(),
          status: 'fresh' as const  // or 'fresh' as RufasBundle['status']
        } : b
      )
      await updateBundles(updatedBundles)
      await loadBundles()
    } catch (error) {
      console.error('Failed to refresh bundle:', error)
      setError('Failed to refresh bundle')
    }
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Bundles</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedFiles.length === 0}
            >
              <Plus className="h-4 w-4" />
              New Bundle {selectedFiles.length > 0 && `(${selectedFiles.length} files)`}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bundle</DialogTitle>
              <DialogDescription>
                Create a new bundle with the selected files.
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
                  value={newBundle.name}
                  onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })}
                  className="col-span-3"
                  maxLength={50}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input
                  id="description"
                  value={newBundle.description}
                  onChange={(e) => setNewBundle({ ...newBundle, description: e.target.value })}
                  className="col-span-3"
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isMaster" className="text-right">Master Bundle</Label>
                <Input
                  id="isMaster"
                  type="checkbox"
                  checked={newBundle.isMaster}
                  onChange={(e) => setNewBundle({ ...newBundle, isMaster: e.target.checked })}
                  className="col-span-3 h-4 w-4"
                />
              </div>
              <div className="col-span-4">
                <Label className="text-sm text-muted-foreground">Selected Files:</Label>
                <ScrollArea className="h-32 w-full rounded-md border mt-2">
                  <div className="p-4">
                    {selectedFiles.map((file) => (
                      <div key={file} className="text-sm">{file}</div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateBundle}>Create Bundle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      {/* Edit Bundle Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Bundle</DialogTitle>
            <DialogDescription>
              Modify the bundle properties and manage included files.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedBundle && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedBundle.name}
                    onChange={(e) => setSelectedBundle({ ...selectedBundle, name: e.target.value })}
                    maxLength={50}
                    placeholder="Enter bundle name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={selectedBundle.description}
                    onChange={(e) => setSelectedBundle({ ...selectedBundle, description: e.target.value })}
                    maxLength={200}
                    placeholder="Enter bundle description..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-isMaster"
                    checked={selectedBundle.isMaster}
                    onChange={(e) => setSelectedBundle({ ...selectedBundle, isMaster: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="edit-isMaster" className="font-normal">
                    Set as master bundle
                  </Label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Included Files</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedBundle.fileIds.length} files
                  </span>
                </div>

                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {selectedBundle.fileIds.map((file) => (
                      <div
                        key={file}
                        className="flex items-center justify-between text-sm py-1 px-2 hover:bg-muted rounded-sm group"
                      >
                        <span className="truncate">{file}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setSelectedBundle({
                              ...selectedBundle,
                              fileIds: selectedBundle.fileIds.filter(f => f !== file)
                            })
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <div className="flex items-center text-xs text-muted-foreground">
              Last modified: {selectedBundle ? new Date(selectedBundle.lastBundled).toLocaleString() : ''}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => selectedBundle && handleEditBundle(selectedBundle)}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bundle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bundle? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedBundle && handleDeleteBundle(selectedBundle)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing Bundles */}
      <div className="space-y-2">
        {bundles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bundles created yet</p>
        ) : (
          bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="flex items-center justify-between p-2 rounded-md border"
            >
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <p className="font-medium">
                    {bundle.name}
                    {bundle.isMaster && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Master
                      </span>
                    )}
                  </p>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded ${bundle.status === 'fresh'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-yellow-500/10 text-yellow-500'
                      }`}
                  >
                    {bundle.status}
                  </span>
                </div>
                {bundle.description && (
                  <p className="text-sm text-muted-foreground">{bundle.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {bundle.fileIds.length} files • Last bundled: {new Date(bundle.lastBundled).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleRefreshBundle(bundle)}
                  disabled={bundle.status === 'fresh'}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedBundle(bundle)
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
                    setSelectedBundle(bundle)
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

export default BundleManagement
