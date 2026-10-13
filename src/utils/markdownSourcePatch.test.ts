import integrityMarkdown from '../test/fixtures/markdown-integrity.md?raw'
import renderedMarkdown from '../test/fixtures/markdown-integrity-rendered.md?raw'
import { describe, expect, it } from 'vitest'
import { patchMarkdownSource } from './markdownSourcePatch'

describe('source-preserving rich edits', () => {
  it('applies a single character edit without rewriting invisible HTML, entities or tables', () => {
    const source = integrityMarkdown.replace(/\n/g, '\r\n')
    const baseline = renderedMarkdown
    expect(patchMarkdownSource(source, baseline, baseline.replace('Inline code:', 'Inline codes:')))
      .toBe(source.replace('Inline code:', 'Inline codes:'))
  })

  it('preserves source bytes when the rich document has no changes', () => {
    expect(patchMarkdownSource('A &amp; B\r\n', 'A & B\n', 'A & B\n')).toBe('A &amp; B\r\n')
  })

  it('keeps source spellings across separate edits and real wikilink changes', () => {
    const source = 'One &amp; two.\n\n[[Old]] and snake_case.\n'
    const baseline = 'One & two.\n\n[[Old]] and snake_case.\n'
    const next = 'Ones & two.\n\n[[New]] and snake_case!\n'
    expect(patchMarkdownSource(source, baseline, next))
      .toBe('Ones &amp; two.\n\n[[New]] and snake_case!\n')
  })

  it('allows deleting visible content adjacent to an invisible HTML placeholder', () => {
    const placeholder = integrityMarkdown.split('\n')[1]
    const source = `${placeholder.replace('Placeholder:', 'ABC')}\n`
    const expected = `${placeholder.replace('Placeholder:', 'AB')}\n`
    expect(patchMarkdownSource(source, 'ABC \n', 'AB \n')).toBe(expected)
  })

  it('edits entity text without modifying a matching invisible placeholder', () => {
    const source = integrityMarkdown
    const baseline = renderedMarkdown
    expect(patchMarkdownSource(source, baseline, baseline.replace('term', 'terms')))
      .toBe(source.replace('&lt;term&gt;', '&lt;terms&gt;'))
  })

  it('replaces a displayed entity without retaining its source suffix', () => {
    expect(patchMarkdownSource('A &amp; B\n', 'A & B\n', 'A plus B\n')).toBe('A plus B\n')
  })
  it('deletes a rich line break without leaving an orphan carriage return', () => {
    expect(patchMarkdownSource('A\r\nB\r\n', 'A\nB\n', 'AB\n')).toBe('AB\r\n')
  })

  it('uses the original line ending when inserting a rich line break', () => {
    expect(patchMarkdownSource('AB\r\n', 'AB\n', 'A\nB\n')).toBe('A\r\nB\r\n')
  })

})
