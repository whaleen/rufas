// config.ts

export const FILE_SYSTEM_CONFIG = {
  // File/directory ignore patterns
  ignored: {
    exact: ['.DS_Store', 'Thumbs.db', 'node_modules', '.next'],
    startsWith: ['.', '_'],
    endsWith: ['.log', '.tmp'],
  },

  // Polling configuration
  polling: {
    enabled: true,
    intervalMs: 3000, // 3 seconds
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
