import { markdownTextEdits, type MarkdownTextEdit } from './markdownTextDiff'

interface SourceSpan {
  sourceFrom: number
  sourceTo: number
  renderedFrom: number
  renderedTo: number
}

function sourceSpans(source: string, rendered: string): SourceSpan[] {
  let offset = 0
  const spans = markdownTextEdits(source, rendered).map(edit => {
    const renderedFrom = edit.from + offset
    offset += edit.insert.length - (edit.to - edit.from)
    return {
      sourceFrom: edit.from,
      sourceTo: edit.to,
      renderedFrom,
      renderedTo: renderedFrom + edit.insert.length,
    }
  })
  return protectSourceTokenSpans(source, spans)
}

function renderedPosition(spans: SourceSpan[], position: number, end: boolean): number {
  let offset = 0
  for (const span of spans) {
    if (position < span.sourceFrom) break
    if (position === span.sourceFrom) return span.renderedFrom
    if (position === span.sourceTo) return span.renderedTo
    if (position <= span.sourceTo) return end ? span.renderedTo : span.renderedFrom
    offset = span.renderedTo - span.sourceTo
  }
  return position + offset
}

function protectSourceTokenSpans(source: string, spans: SourceSpan[]): SourceSpan[] {
  let result = spans
  for (const match of source.matchAll(/&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);|\r\n/giu)) {
    const from = match.index
    const to = from + match[0].length
    const contained = result.filter(span => span.sourceFrom >= from && span.sourceTo <= to)
    if (contained.length === 0) continue
    const token = {
      sourceFrom: from,
      sourceTo: to,
      renderedFrom: renderedPosition(spans, from, false),
      renderedTo: renderedPosition(spans, to, true),
    }
    result = [...result.filter(span => !contained.includes(span)), token]
      .sort((left, right) => left.sourceFrom - right.sourceFrom)
  }
  return result
}

function sourcePosition(spans: SourceSpan[], position: number, affinity: 'before' | 'after'): number {
  let offset = 0
  for (const span of spans) {
    if (position < span.renderedFrom) break
    if (position <= span.renderedTo) {
      if (span.renderedFrom !== span.renderedTo) {
        if (position === span.renderedFrom) return span.sourceFrom
        if (position === span.renderedTo) return span.sourceTo
      }
      if (position === span.renderedFrom && affinity === 'before') return span.sourceFrom
      if (position === span.renderedTo && affinity === 'after') return span.sourceTo
      return affinity === 'before' ? span.sourceFrom : span.sourceTo
    }
    offset = span.sourceTo - span.renderedTo
  }
  return position + offset
}

function sourceEdit(spans: SourceSpan[], edit: MarkdownTextEdit): MarkdownTextEdit {
  const from = sourcePosition(spans, edit.from, 'after')
  const to = edit.from === edit.to ? from : sourcePosition(spans, edit.to, 'before')
  return { from, to: Math.max(from, to), insert: edit.insert }
}

/** Apply only rich-editor changes to the original file, retaining untouched source spellings. */
export function patchMarkdownSource(source: string, renderedBefore: string, renderedAfter: string): string {
  const edits = markdownTextEdits(renderedBefore, renderedAfter)
  if (edits.length === 0) return source
  const spans = sourceSpans(source, renderedBefore)
  let result = source
  const separator = source.match(/\r\n|\r|\n/)?.[0] ?? '\n'
  for (const edit of [...edits].reverse()) {
    const mapped = sourceEdit(spans, edit)
    result = result.slice(0, mapped.from) + mapped.insert.replace(/\n/g, separator) + result.slice(mapped.to)
  }
  return result
}
