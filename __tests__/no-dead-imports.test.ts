import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, extname } from 'path'

/**
 * Feature: heroui-chat-layout, Property 11: No dead imports
 * Validates: Requirements 7.7
 *
 * For any TypeScript/TSX source file in the project, it should not contain
 * import statements referencing HorizontalSlider, NavigationIndicator,
 * ChatWidget, or ChatSlide.
 */

const BANNED_IMPORTS = [
  'HorizontalSlider',
  'NavigationIndicator',
  'ChatWidget',
  'ChatSlide',
]

const EXCLUDED_DIRS = ['node_modules', '.next', '__tests__', '.git']

function getSourceFiles(dir: string): string[] {
  const files: string[] = []

  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)

    if (EXCLUDED_DIRS.includes(entry)) continue

    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...getSourceFiles(fullPath))
    } else {
      const ext = extname(entry)
      if (ext === '.ts' || ext === '.tsx') {
        files.push(fullPath)
      }
    }
  }

  return files
}

describe('Property 11: No dead imports', () => {
  it('no source file imports deleted components', () => {
    const projectRoot = join(__dirname, '..')
    const files = getSourceFiles(projectRoot)

    expect(files.length).toBeGreaterThan(0)

    const violations: string[] = []

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      for (const banned of BANNED_IMPORTS) {
        const regex = new RegExp(`import\\s.*${banned}`, 'm')
        if (regex.test(content)) {
          const relativePath = file.replace(projectRoot + '/', '')
          violations.push(`${relativePath} imports "${banned}"`)
        }
      }
    }

    expect(violations, `Dead imports found:\n${violations.join('\n')}`).toHaveLength(0)
  })
})
