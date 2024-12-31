// config.ts

export const FILE_SYSTEM_CONFIG = {
  // File/directory ignore patterns
  ignored: {
    exact: [
      '.DS_Store',
      'Thumbs.db',
      'node_modules',
      '.next',
      'package-lock.json',
    ],
    startsWith: ['.', '_'],
    endsWith: ['.log', '.tmp'],
  },

  // Polling configuration
  polling: {
    enabled: true,
    intervalMs: 1000, // 1 second
  },
} as const

export function shouldIgnore(name: string): boolean {
  return (
    FILE_SYSTEM_CONFIG.ignored.exact.includes(name) ||
    FILE_SYSTEM_CONFIG.ignored.startsWith.some((pattern) =>
      name.startsWith(pattern)
    ) ||
    FILE_SYSTEM_CONFIG.ignored.endsWith.some((pattern) =>
      name.endsWith(pattern)
    )
  )
}

// The initial tags that are created when the app is first opened
// we only want to use these value once and then NEVER AGAIN!!!
// these are just meant to give the user some defaults in the beginning
// the ids are named differently when wtiting to the file system
// so we need to see how name handle these here to keep things consistent
export const INIT_TAGS = [
  {
    id: '1',
    name: 'config',
    description: 'The stuff that nightmares are made of.',
    color: 'gray',
  },
  {
    id: '2',
    name: 'docs',
    description: 'What is this project and why is this project',
    color: 'blue',
  },
  {
    id: '3',
    name: 'features',
    description:
      'For main feature implementations. Components that implement major user-facing functionality',
    color: 'green',
  },
  {
    id: '4',
    name: 'components-ui',
    description:
      'For reusable UI components and interface elements. Basic building blocks like button.tsx, dialog.tsx, input.tsx.',
    color: 'purple',
  },
  {
    id: '5',
    name: 'core',
    description:
      'For critical system files that handle the fundamental operations. Files that implement the core concepts and handle state management',
    color: 'red',
  },
  {
    id: '6',
    name: 'types',
    description:
      'For type definitions and interfaces. Files that primarily define types and interfaces used across the project.',
    color: 'yellow',
  },
] as const
