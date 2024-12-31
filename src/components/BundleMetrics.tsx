import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAllFiles } from '../databaseOperations'
import { useState, useEffect } from 'react'
import { type RufasFile } from '../database'

type BundleMetrics = {
  addedFiles: string[]
  removedFiles: string[]
  modifiedFiles: string[]
}

function calculateBundleMetrics(
  currentFiles: string[],
  exportedFiles: string[],
  allFiles: RufasFile[],
  lastExportTime: number
): BundleMetrics {
  const currentSet = new Set(currentFiles)
  const exportedSet = new Set(exportedFiles)

  const addedFiles = currentFiles.filter(file => !exportedSet.has(file))
  const removedFiles = exportedFiles.filter(file => !currentSet.has(file))

  // For files that exist in both sets, check modification time
  // 
  const modifiedFiles = currentFiles.filter(fileId => {
    if (!exportedSet.has(fileId)) return false // Skip if not in both sets
    const file = allFiles.find(f => f.id === fileId)
    if (!file) return false
    return file.lastModified > lastExportTime
  })
  console.log(modifiedFiles)

  return {
    addedFiles,
    removedFiles,
    modifiedFiles
  }
}

function BundleMetrics({ bundle }) {
  const [allFiles, setAllFiles] = useState<RufasFile[]>([])

  useEffect(() => {
    // Load all files to check modification times
    const loadFiles = async () => {
      const files = await getAllFiles()
      setAllFiles(files)
    }
    loadFiles()
  }, [])

  // If never exported, show different message
  if (!bundle.lastExport) {
    return (
      <p className="text-xs text-muted-foreground">
        Never exported • {bundle.fileIds.length} files
      </p>
    )
  }

  const metrics = calculateBundleMetrics(
    bundle.fileIds,
    bundle.lastExport.fileIds,
    allFiles,
    bundle.lastExport.timestamp
  )

  const hasChanges = metrics.addedFiles.length > 0 ||
    metrics.removedFiles.length > 0 ||
    metrics.modifiedFiles.length > 0

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Last exported {new Date(bundle.lastExport.timestamp).toLocaleString()} • {bundle.fileIds.length} files
      </p>

      {hasChanges && (
        <Alert variant="default" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="text-sm">Changes since last export:</div>
            <ul className="text-xs list-disc pl-4 mt-1">
              {metrics.addedFiles.length > 0 && (
                <li>{metrics.addedFiles.length} new file(s) will be included</li>
              )}
              {metrics.removedFiles.length > 0 && (
                <li>{metrics.removedFiles.length} file(s) have been removed</li>
              )}
              {metrics.modifiedFiles.length > 0 && (
                <li>
                  {metrics.modifiedFiles.length} file(s) have been modified <span className='text-muted-foreground'>(
                    {metrics.modifiedFiles.join(', ')})</span>
                </li>

              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default BundleMetrics
