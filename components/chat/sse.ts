/**
 * Minimal Server-Sent Events reader for the chat stream.
 *
 * `EventSource` cannot be used here because the chat endpoint is a POST with a
 * JSON body and custom headers, so the response body is read manually. The
 * parsing is deliberately kept as two pure-ish pieces (`parseSSEFrame` for one
 * frame, `readSSE` for the chunk → frame boundary bookkeeping) so both are
 * testable without a network.
 *
 * Wire format produced by `app/api/chat/route.ts`:
 *
 *   event: chunk\n
 *   data: {"text":"..."}\n
 *   \n
 *
 * `data` is always JSON — that is what makes streaming Markdown safe, since
 * `JSON.stringify` escapes the newlines that would otherwise terminate a frame
 * in the middle of a reply.
 */

export interface SSEMessage {
  /** SSE `event:` field. Defaults to `'message'` when the server omits it. */
  event: string
  /** Parsed `data:` payload — the JSON value, or the raw string if not JSON. */
  data: unknown
}

/**
 * Parses a single SSE frame (the text between two blank lines).
 * Returns `null` for frames that carry no `data` field — comments (`: ping`)
 * and keep-alives, which must not surface to the caller as messages.
 */
export function parseSSEFrame(frame: string): SSEMessage | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of frame.split('\n')) {
    // A leading colon marks a comment line (used for keep-alive pings).
    if (line === '' || line.startsWith(':')) continue

    const sep = line.indexOf(':')
    const field = sep === -1 ? line : line.slice(0, sep)
    let value = sep === -1 ? '' : line.slice(sep + 1)
    // The spec allows exactly one optional space after the colon.
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }

  if (dataLines.length === 0) return null

  const raw = dataLines.join('\n')
  try {
    return { event, data: JSON.parse(raw) }
  } catch {
    return { event, data: raw }
  }
}

/**
 * Reads a `text/event-stream` body and yields one `SSEMessage` per frame as it
 * arrives. Chunk boundaries from the network do not line up with frame
 * boundaries, so partial text is buffered until a blank line is seen.
 */
export async function* readSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEMessage, void, undefined> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      // Normalise the WHOLE buffer (not just the new chunk) — a CRLF pair can
      // be split across two network chunks, and normalising per-chunk would
      // leave a stray \r that breaks the \n\n frame delimiter.
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const message = parseSSEFrame(frame)
        if (message) yield message
        boundary = buffer.indexOf('\n\n')
      }
    }

    // A well-behaved server ends every frame with a blank line, but tolerate a
    // final frame that arrives without its trailing delimiter.
    const tail = parseSSEFrame(buffer)
    if (tail) yield tail
  } finally {
    reader.releaseLock()
  }
}
