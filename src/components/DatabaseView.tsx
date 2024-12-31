import { useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFileSystemStore } from '../store/fileSystemStore'
import { getAllFiles, getAllTags, getAllBundles } from '../databaseOperations'
import { RufasFile, RufasTag, RufasBundle } from '../database'

const DatabaseTable = ({ data, columns }: {
  data: any[],
  columns: { key: string; label: string }[]
}) => {
  console.log('Rendering DatabaseTable with data:', data?.length); // Debug log

  if (!data || data.length === 0) {
    return <div className="p-4 text-muted-foreground">No data</div>;
  }

  return (
    <div className="h-dvh pb-36">
      <ScrollArea className="h-full border rounded-md">
        <div className="w-full">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map(col => (
                  <th key={col.key} className="p-2 text-left text-xs font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id || i} className="border-b">
                  {columns.map(col => (
                    <td key={col.key} className="p-2 text-xs font-mono">
                      {Array.isArray(row[col.key])
                        ? row[col.key].length > 0
                          ? row[col.key].join(', ')
                          : '-'
                        : typeof row[col.key] === 'boolean'
                          ? row[col.key].toString()
                          : row[col.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
};

export function DatabaseView() {
  const [files, setFiles] = useState<RufasFile[]>([]);
  const [tags, setTags] = useState<RufasTag[]>([]);
  const [bundles, setBundles] = useState<RufasBundle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isPolling = useFileSystemStore(state => state.isPolling);
  const initialized = useFileSystemStore(state => state.initialized);
  const dirHandle = useFileSystemStore(state => state.dirHandle);

  const fileColumns = [
    { key: 'id', label: 'ID' },
    { key: 'path', label: 'Path' },
    { key: 'tagIds', label: 'Tags' },
    { key: 'bundleIds', label: 'Bundles' },
    { key: 'lastModified', label: 'Last Modified' }
  ];

  const tagColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'color', label: 'Color' },
    { key: 'fileIds', label: 'Files' }
  ];

  const bundleColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'fileIds', label: 'Files' },
    { key: 'isMaster', label: 'Is Master' },
    { key: 'createdAt', label: 'Created At' }
  ];

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!initialized || !dirHandle) {
        console.log('Not loading data - not initialized or no dirHandle'); // Debug log
        return;
      }

      try {
        console.log('Loading database data...'); // Debug log
        const [newFiles, newTags, newBundles] = await Promise.all([
          getAllFiles(),
          getAllTags(),
          getAllBundles()
        ]);
        console.log('Loaded files:', newFiles?.length); // Debug log

        if (mounted) {
          setFiles(newFiles.map(file => ({
            ...file,
            lastModified: new Date(file.lastModified).toLocaleString()
          })));
          setTags(newTags);
          setBundles(newBundles.map(bundle => ({
            ...bundle,
            createdAt: new Date(bundle.createdAt).toLocaleString()
          })));
          setError(null);
        }
      } catch (error) {
        console.error('Failed to load database data:', error);
        if (mounted) {
          setError('Failed to load database data');
        }
      }
    };

    loadData();

    const intervalId = setInterval(() => {
      if (isPolling) {
        loadData();
      }
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [initialized, isPolling, dirHandle]);

  if (!initialized || !dirHandle) {
    return null;
  }

  return (
    <div className="px-8 py-2">
      <h2 className="text-lg font-semibold mb-4">RufasDB Studio</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">files.json ({files.length})</TabsTrigger>
          <TabsTrigger value="tags">tags.json ({tags.length})</TabsTrigger>
          <TabsTrigger value="bundles">bundles.json ({bundles.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="files" className="mt-4">
          <DatabaseTable data={files} columns={fileColumns} />
        </TabsContent>
        <TabsContent value="tags" className="mt-4">
          <DatabaseTable data={tags} columns={tagColumns} />
        </TabsContent>
        <TabsContent value="bundles" className="mt-4">
          <DatabaseTable data={bundles} columns={bundleColumns} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DatabaseView;
