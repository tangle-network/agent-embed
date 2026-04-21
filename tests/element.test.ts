// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineTangleAgent, TangleAgentElement } from '../src/index'

beforeEach(() => {
  // Fresh DOM per test
  document.body.innerHTML = ''
  defineTangleAgent()
})

describe('<tangle-agent>', () => {
  it('registers the custom element', () => {
    expect(customElements.get('tangle-agent')).toBe(TangleAgentElement)
  })

  it('renders missing-slug error when slug attr is absent — regression: silent empty render tricks embedders', async () => {
    document.body.innerHTML = `<tangle-agent></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    await new Promise((r) => setTimeout(r, 0))
    const err = el.shadowRoot!.querySelector('.msg.error') as HTMLElement
    expect(err?.textContent ?? '').toMatch(/missing required attribute "slug"/)
  })

  it('renders initial welcome banner with agent slug', () => {
    document.body.innerHTML = `<tangle-agent slug="tax-freelancer" height="400px"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    const banner = el.shadowRoot!.querySelector('.msg.system')
    expect(banner?.textContent ?? '').toContain('tax-freelancer')
  })

  it('host attribute overrides default <slug>.tangle.app', () => {
    document.body.innerHTML = `<tangle-agent slug="x" host="https://agent.customer.com"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    // Access private via bracket notation for the test
    expect((el as unknown as { host: string }).host).toBe('https://agent.customer.com')
  })

  it('welcome attribute overrides banner text', () => {
    document.body.innerHTML = `<tangle-agent slug="x" welcome="custom greeting"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    const banner = el.shadowRoot!.querySelector('.msg.system')
    expect(banner?.textContent).toBe('custom greeting')
  })

  it('setApiKey persists per-slug in localStorage', () => {
    document.body.innerHTML = `<tangle-agent slug="tax-freelancer"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    el.setApiKey('sk-tan-abcd')
    expect(localStorage.getItem('tangle.agent.embed.key:tax-freelancer')).toBe('sk-tan-abcd')
  })

  it('clear() resets history and re-renders welcome banner', () => {
    document.body.innerHTML = `<tangle-agent slug="x"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    const messages = el.shadowRoot!.querySelector('.messages')!
    const extra = document.createElement('div')
    extra.className = 'msg user'
    extra.textContent = 'stale'
    messages.appendChild(extra)
    el.clear()
    expect(messages.textContent).not.toContain('stale')
    expect(messages.querySelector('.msg.system')?.textContent).toContain('Paste a sk-tan-*')
  })

  it('refuses to send without an API key — regression: silent fetch without auth leaks user intent', async () => {
    document.body.innerHTML = `<tangle-agent slug="x"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))
    await el.send('hello')
    // Should not have fired a chat POST (only possibly a /health check if timing races, but that's GET)
    const chatCalls = fetchSpy.mock.calls.filter(([input, init]) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      return url.endsWith('/v1/chat/completions') && (init as RequestInit | undefined)?.method === 'POST'
    })
    expect(chatCalls).toHaveLength(0)
    const err = el.shadowRoot!.querySelector('.msg.error')
    expect(err?.textContent).toMatch(/Paste your sk-tan/)
    fetchSpy.mockRestore()
  })

  it('dispatches tangle-agent:ready after a successful /health', async () => {
    document.body.innerHTML = `<tangle-agent slug="x"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    const ready = vi.fn()
    el.addEventListener('tangle-agent:ready', ready)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    // Force re-invoke
    el.setAttribute('slug', 'x-again')
    await new Promise((r) => setTimeout(r, 20))
    expect(ready).toHaveBeenCalled()
  })

  it('streaming parses SSE and appends chunks into the assistant bubble', async () => {
    document.body.innerHTML = `<tangle-agent slug="x"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    el.setApiKey('sk-tan-test')
    // Fake health ok
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.endsWith('/health')) return new Response(JSON.stringify({ ok: true }))
      if (url.endsWith('/v1/chat/completions') && init?.method === 'POST') {
        const enc = new TextEncoder()
        const stream = new ReadableStream({
          start(c) {
            c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"Hel"}}]}\n'))
            c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n'))
            c.enqueue(enc.encode('data: [DONE]\n'))
            c.close()
          },
        })
        return new Response(stream, { status: 200 })
      }
      return new Response('', { status: 404 })
    })
    await el.send('hi')
    // Wait for async stream to drain
    await new Promise((r) => setTimeout(r, 100))
    const assistantBubbles = Array.from(el.shadowRoot!.querySelectorAll('.msg.assistant'))
    const last = assistantBubbles[assistantBubbles.length - 1]
    expect(last?.textContent).toBe('Hello')
    fetchSpy.mockRestore()
  })

  it('surfaces HTTP error as error message + event — regression: silent 5xx leaves users confused', async () => {
    document.body.innerHTML = `<tangle-agent slug="x"></tangle-agent>`
    const el = document.querySelector('tangle-agent')! as TangleAgentElement
    el.setApiKey('sk-tan-test')
    const errEvt = vi.fn()
    el.addEventListener('tangle-agent:error', errEvt)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.endsWith('/health')) return new Response(JSON.stringify({ ok: true }))
      if (url.endsWith('/v1/chat/completions') && init?.method === 'POST') {
        return new Response('upstream failed', { status: 502 })
      }
      return new Response('', { status: 404 })
    })
    await el.send('hi')
    await new Promise((r) => setTimeout(r, 30))
    expect(errEvt).toHaveBeenCalled()
    const errBubble = el.shadowRoot!.querySelectorAll('.msg.error')
    expect(Array.from(errBubble).some((n) => (n.textContent ?? '').includes('502'))).toBe(true)
  })
})
