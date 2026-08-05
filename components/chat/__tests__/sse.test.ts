/**
 * Tests for the chat SSE reader (`components/chat/sse.ts`).
 *
 * The parser has to survive the two things a real network guarantees: frames
 * split across chunk boundaries, and Markdown payloads full of newlines.
 */
import { describe, it, expect } from 'vitest'
import { parseSSEFrame, readSSE, isToolStatus } from '../sse'

/** Builds a ReadableStream that emits the given strings as separate chunks. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const out: { event: string; data: unknown }[] = []
  for await (const message of readSSE(stream)) out.push(message)
  return out
}

describe('parseSSEFrame', () => {
  it('parses the event name and JSON data', () => {
    expect(parseSSEFrame('event: chunk\ndata: {"text":"hi"}')).toEqual({
      event: 'chunk',
      data: { text: 'hi' },
    })
  })

  it('defaults the event name to "message"', () => {
    expect(parseSSEFrame('data: {"text":"hi"}')?.event).toBe('message')
  })

  it('returns null for comment-only frames (keep-alive pings)', () => {
    expect(parseSSEFrame(': open')).toBeNull()
    expect(parseSSEFrame('')).toBeNull()
  })

  it('joins multi-line data fields with newlines', () => {
    expect(parseSSEFrame('event: done\ndata: line one\ndata: line two')?.data).toBe(
      'line one\nline two',
    )
  })

  it('falls back to the raw string when the payload is not JSON', () => {
    expect(parseSSEFrame('data: not json')?.data).toBe('not json')
  })
})

describe('readSSE', () => {
  it('yields one message per frame', async () => {
    const messages = await collect(
      streamOf([
        'event: chunk\ndata: {"text":"a"}\n\n',
        'event: chunk\ndata: {"text":"b"}\n\n',
        'event: done\ndata: {"text":"ab"}\n\n',
      ]),
    )

    expect(messages).toEqual([
      { event: 'chunk', data: { text: 'a' } },
      { event: 'chunk', data: { text: 'b' } },
      { event: 'done', data: { text: 'ab' } },
    ])
  })

  it('reassembles a frame that is split across network chunks', async () => {
    const messages = await collect(streamOf(['event: chu', 'nk\ndata: {"te', 'xt":"a"}\n\n']))

    expect(messages).toEqual([{ event: 'chunk', data: { text: 'a' } }])
  })

  it('skips keep-alive comments without emitting a message', async () => {
    const messages = await collect(streamOf([': open\n\n', 'event: chunk\ndata: {"text":"a"}\n\n']))

    expect(messages).toHaveLength(1)
  })

  it('preserves newlines inside a Markdown payload', async () => {
    const markdown = '# Title\n\n- one\n- two\n\n```resume-chart\n{}\n```'
    const messages = await collect(
      streamOf([`event: done\ndata: ${JSON.stringify({ text: markdown })}\n\n`]),
    )

    expect((messages[0].data as { text: string }).text).toBe(markdown)
  })

  it('handles CRLF line endings split across chunks', async () => {
    const messages = await collect(streamOf(['event: chunk\r\ndata: {"text":"a"}\r', '\n\r\n']))

    expect(messages).toEqual([{ event: 'chunk', data: { text: 'a' } }])
  })

  it('emits a trailing frame that arrives without its blank-line delimiter', async () => {
    const messages = await collect(streamOf(['event: done\ndata: {"text":"a"}']))

    expect(messages).toEqual([{ event: 'done', data: { text: 'a' } }])
  })

  it('exposes tool frames alongside the text frames', async () => {
    const messages = await collect(
      streamOf([
        'event: tool\ndata: {"tool":"searchResume","phase":"start","id":"c1"}\n\n',
        'event: chunk\ndata: {"text":"a"}\n\n',
      ]),
    )

    expect(messages[0]).toEqual({
      event: 'tool',
      data: { tool: 'searchResume', phase: 'start', id: 'c1' },
    })
  })
})

describe('isToolStatus', () => {
  it('accepts a well-formed payload', () => {
    expect(isToolStatus({ tool: 'searchResume', phase: 'start' })).toBe(true)
    expect(isToolStatus({ tool: 'searchResume', phase: 'end', count: 5 })).toBe(true)
  })

  it('accepts an unknown tool name — the client falls back, it does not reject', () => {
    expect(isToolStatus({ tool: 'somethingNew', phase: 'start' })).toBe(true)
  })

  it('rejects malformed payloads', () => {
    expect(isToolStatus(null)).toBe(false)
    expect(isToolStatus('tool')).toBe(false)
    expect(isToolStatus({ tool: 'searchResume' })).toBe(false)
    expect(isToolStatus({ tool: 'searchResume', phase: 'bogus' })).toBe(false)
    expect(isToolStatus({ phase: 'start' })).toBe(false)
  })
})
