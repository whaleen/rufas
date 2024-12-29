# File System Monitor & Bundle System Documentation

## Current System Overview

### Core Components

#### 1. File System Monitoring

- Uses the File System Access API to monitor a selected directory
- Implements polling every 5 seconds to detect changes
- Maintains real-time directory structure in the UI via TreeView component

#### 2. Database Structure

Located in `.rufas/database/` with three JSON files:

**files.json**

- Tracks all monitored files
- Schema:

```typescript
{
  id: string,      // Full file path as unique identifier
  path: string,    // Full file path (same as id currently)
  tagIds: string[],
  bundleIds: string[],
  lastModified: number
}
```

**tags.json**

- Stores user-defined tags
- Schema:

```typescript
{
  id: string,
  name: string,
  description: string,
  color: string,
  fileIds: string[]
}
```

**bundles.json**

- Defines file bundles
- Schema:

```typescript
{
  id: string,
  name: string,
  description: string,
  fileIds: string[],
  isMaster: boolean,
  createdAt: number,
  lastBundled: number,
  status: 'fresh' | 'stale'
}
```

### Key Processes

#### Directory Initialization

1. User selects directory via `openFolder()`
2. System creates `.rufas/database` if it doesn't exist
3. Initializes empty database files if needed
4. Scans directory recursively for all files
5. Creates database entries for found files

#### File System Polling

1. Runs every 5 seconds when enabled
2. Scans entire directory structure
3. Compares current files with database:
   - Identifies new files
   - Maintains existing files with their metadata
   - Removes entries for deleted files
4. Updates database to reflect changes
5. Updates UI to show current state

#### File Selection

- Uses TreeView component for visual selection
- Maintains selected items in React state
- Shows selected files in dedicated UI section

### Technical Implementation

#### Key Files

- `fileSystemStore.ts`: Main state management
- `databaseOperations.ts`: Database CRUD operations
- `utils/fileSystem.ts`: File system utilities
- `App.tsx`: Main UI component
- `components/tree-view.tsx`: File tree visualization

#### State Management

- Uses Zustand for state management
- Maintains separate UI state and persistent database state
- Handles initialization and polling logic

## Planned Features

### Priority 1: Tag System

1. UI Components
   - Tag creation interface
   - Tag assignment to files
   - Tag visualization in TreeView
2. Database Operations
   - Tag CRUD operations
   - File-tag relationship management
3. Features
   - Tag-based file filtering
   - Tag color coding
   - Tag statistics

### Priority 2: Bundle System

1. Basic Bundle Management
   - Bundle creation UI
   - File grouping into bundles
   - Bundle status tracking
2. Master Bundle Support
   - Special handling for master bundle
   - Directory-wide bundling
3. Bundle Operations
   - Bundle generation
   - Stale state handling
   - Bundle regeneration

### Priority 3: Enhanced File Tracking

1. File Move Detection
   - Track file moves/renames
   - Maintain metadata across moves
2. File Content Monitoring
   - Track actual file modifications
   - Implement proper lastModified tracking
3. Orphaned Entry Cleanup
   - Detect and manage orphaned entries
   - Cleanup procedures

### Priority 4: UI Improvements

1. Advanced Selection
   - Multi-select improvements
   - Bulk operations
2. Filtering & Search
   - File type filtering
   - Path-based search
   - Tag-based search
3. Metadata Display
   - File details panel
   - Tag management panel
   - Bundle status display

---

1. Bundle Status Management

   - Implement `updateBundleStatuses` to automatically detect stale bundles
   - Add file system watching to mark bundles as stale when source files change
   - Add batch refresh capability for multiple stale bundles

2. File Tagging System Enhancement

   - Add ability to tag multiple files at once
   - Add tag filtering/search in the file tree
   - Add tag color visualization in the file tree
   - Implement tag inheritance for folders

3. Bundle Generation

   - Add actual file bundling functionality
   - Support different bundling strategies (concatenation, minification, etc.)
   - Add bundle preview capability
   - Support different output formats
   - Add bundle dependency tracking

4. File System Integration

   - Improve file watching/polling system
   - Add file modification tracking
   - Handle file moves and renames gracefully

5. Search and Filter

   - Implement file search by name/content
   - Add advanced filtering by tags, bundles, and dates
   - Add saved searches/filters

6. User Experience Improvements

   - Add drag-and-drop support for file selection
   - Add keyboard shortcuts
   - Add bulk operations for tags and bundles
   - Add undo/redo functionality
   - Add progress indicators for long operations

7. Data Management
   - Add import/export functionality for tags and bundles
   - Add backup/restore capability for .rufas directory
   - Add data migration tools for schema updates

Would you like me to elaborate on any of these areas?
