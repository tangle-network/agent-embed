/**
 * <tangle-agent> — drop-in web component for embedding any Tangle
 * marketplace agent into any webpage.
 *
 * Usage (script tag):
 *   <script src="https://tangle.app/embed.js"></script>
 *   <tangle-agent slug="tax-freelancer"></tangle-agent>
 *
 * Usage (npm):
 *   import '@tangle-network/agent-embed'
 *   // or
 *   import { TangleAgentElement, defineTangleAgent } from '@tangle-network/agent-embed'
 *   defineTangleAgent()  // registers the custom element
 *
 * Attributes:
 *   slug          — (required) the agent's marketplace slug
 *   host          — override base host (default: `<slug>.tangle.app`)
 *   api-key       — sk-tan-* key; if omitted, the component prompts the user
 *   model         — override default model
 *   theme         — 'dark' | 'light' | 'auto' (default 'auto')
 *   height        — CSS height (default '560px')
 *   welcome       — welcome message override
 *
 * Events (dispatched from the element):
 *   tangle-agent:ready       — first handshake succeeded
 *   tangle-agent:message     — { role, content }
 *   tangle-agent:error       — { error, status? }
 *
 * Methods:
 *   send(text)               — programmatically send a message
 *   clear()                  — reset conversation
 *   setApiKey(key)           — set key at runtime
 */

export interface TangleAgentAttrs {
  slug: string
  host?: string
  apiKey?: string
  model?: string
  theme?: 'dark' | 'light' | 'auto'
  height?: string
  welcome?: string
}

export type TangleAgentEventMap = {
  'tangle-agent:ready': CustomEvent<{ slug: string; host: string }>
  'tangle-agent:message': CustomEvent<{ role: 'user' | 'assistant'; content: string }>
  'tangle-agent:error': CustomEvent<{ error: string; status?: number }>
}

type Theme = 'dark' | 'light' | 'auto'

const STYLES = /* css */ `
  :host {
    --bg: #0a0a0a;
    --surface: #141414;
    --border: #262626;
    --text: #f2f2f2;
    --muted: #9a9a9a;
    --accent: #10b981;
    --user-bubble: #1f2937;
    --assistant-bubble: #111827;
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    width: 100%;
  }
  :host([theme="light"]) {
    --bg: #ffffff; --surface: #f6f6f6; --border: #e4e4e7; --text: #111827;
    --muted: #6b7280; --accent: #059669; --user-bubble: #e0e7ff; --assistant-bubble: #f3f4f6;
  }
  @media (prefers-color-scheme: light) {
    :host([theme="auto"]), :host(:not([theme])) {
      --bg: #ffffff; --surface: #f6f6f6; --border: #e4e4e7; --text: #111827;
      --muted: #6b7280; --accent: #059669; --user-bubble: #e0e7ff; --assistant-bubble: #f3f4f6;
    }
  }
  .wrap { display: flex; flex-direction: column; height: 100%; }
  header { padding: 12px 14px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .title { font-size: 13px; font-weight: 600; }
  .status { font-size: 11px; color: var(--muted); }
  .key { padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; width: 160px; }
  .messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 85%; padding: 10px 12px; border-radius: 10px; line-height: 1.5; font-size: 13px; white-space: pre-wrap; word-wrap: break-word; }
  .msg.user { align-self: flex-end; background: var(--user-bubble); }
  .msg.assistant { align-self: flex-start; background: var(--assistant-bubble); border: 1px solid var(--border); }
  .msg.system { align-self: center; background: transparent; color: var(--muted); font-size: 11px; }
  .msg.error { align-self: center; background: transparent; color: #ef4444; font-size: 11px; font-family: ui-monospace, SFMono-Regular, monospace; }
  .composer { border-top: 1px solid var(--border); padding: 10px; display: flex; gap: 6px; }
  textarea { flex: 1; padding: 8px 10px; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 6px; font: inherit; font-size: 13px; resize: none; min-height: 36px; max-height: 160px; }
  button { padding: 0 14px; background: var(--accent); color: #000; border: 0; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; }
  button:disabled { background: var(--border); color: var(--muted); cursor: not-allowed; }
  .spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--muted); border-top-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`

const KEY_STORAGE_PREFIX = 'tangle.agent.embed.key:'

interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string }

export class TangleAgentElement extends HTMLElement {
  static observedAttributes = ['slug', 'host', 'api-key', 'model', 'theme', 'height', 'welcome']

  private shadow: ShadowRoot
  private history: ChatMessage[] = []
  private abortController?: AbortController
  private elements!: {
    root: HTMLDivElement
    messages: HTMLDivElement
    input: HTMLTextAreaElement
    sendBtn: HTMLButtonElement
    keyInput: HTMLInputElement
    status: HTMLSpanElement
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  // ── Lifecycle ─────────────────────────────────────────────────────
  connectedCallback(): void {
    this.render()
    this.bindEvents()
    this.updateKeyFromStorage()
    if (!this.getAttribute('slug')) {
      this.renderError('tangle-agent: missing required attribute "slug"')
      return
    }
    void this.checkReady()
  }

  disconnectedCallback(): void {
    this.abortController?.abort()
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return
    if (name === 'height' && this.elements) {
      this.elements.root.style.height = newValue ?? '560px'
    }
    if (name === 'welcome' && this.elements) {
      this.renderInitialBanner()
    }
    if (name === 'slug' && this.elements) {
      this.clear()
      void this.checkReady()
    }
  }

  // ── Public API ────────────────────────────────────────────────────
  async send(text: string): Promise<void> {
    if (!text.trim()) return
    await this.submit(text.trim())
  }

  clear(): void {
    this.history = []
    if (this.elements) {
      this.elements.messages.innerHTML = ''
      this.renderInitialBanner()
    }
  }

  setApiKey(key: string): void {
    if (this.elements) this.elements.keyInput.value = key
    const slug = this.getAttribute('slug') ?? ''
    if (slug) localStorage.setItem(KEY_STORAGE_PREFIX + slug, key)
  }

  // ── Internal ──────────────────────────────────────────────────────
  private get host(): string {
    const host = this.getAttribute('host')
    if (host) return host.replace(/\/$/, '')
    const slug = this.getAttribute('slug') ?? ''
    return `https://${slug}.tangle.app`
  }

  private get apiKey(): string {
    const attr = this.getAttribute('api-key')
    if (attr) return attr
    const slug = this.getAttribute('slug') ?? ''
    return this.elements?.keyInput.value || localStorage.getItem(KEY_STORAGE_PREFIX + slug) || ''
  }

  private render(): void {
    const height = this.getAttribute('height') ?? '560px'
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="wrap" part="root" style="height:${cssSafe(height)};">
        <header part="header">
          <div>
            <div class="title" part="title">${htmlEscape(this.getAttribute('slug') ?? 'agent')}</div>
            <span class="status" part="status">…</span>
          </div>
          <input class="key" part="key-input" type="password" placeholder="sk-tan-…" autocomplete="off" spellcheck="false">
        </header>
        <div class="messages" part="messages" role="log" aria-live="polite"></div>
        <form class="composer" part="composer">
          <textarea part="input" rows="1" placeholder="Message…"></textarea>
          <button type="submit" part="send">Send</button>
        </form>
      </div>
    `
    const root = this.shadow.querySelector('.wrap') as HTMLDivElement
    this.elements = {
      root,
      messages: this.shadow.querySelector('.messages') as HTMLDivElement,
      input: this.shadow.querySelector('textarea') as HTMLTextAreaElement,
      sendBtn: this.shadow.querySelector('button') as HTMLButtonElement,
      keyInput: this.shadow.querySelector('.key') as HTMLInputElement,
      status: this.shadow.querySelector('.status') as HTMLSpanElement,
    }
    this.renderInitialBanner()
  }

  private renderInitialBanner(): void {
    if (!this.elements) return
    const msg = this.getAttribute('welcome') ?? `Ask ${this.getAttribute('slug') ?? 'the agent'} anything. Paste a sk-tan-* key above to begin.`
    this.elements.messages.innerHTML = ''
    this.appendMsg({ role: 'system', content: msg })
  }

  private renderError(msg: string): void {
    if (!this.elements) return
    const div = document.createElement('div')
    div.className = 'msg error'
    div.textContent = msg
    this.elements.messages.appendChild(div)
  }

  private bindEvents(): void {
    const { input, sendBtn, keyInput } = this.elements
    const form = this.shadow.querySelector('form') as HTMLFormElement
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      void this.submit(input.value.trim())
      input.value = ''
      input.style.height = 'auto'
    })
    input.addEventListener('input', () => {
      input.style.height = 'auto'
      input.style.height = `${Math.min(input.scrollHeight, 160)}px`
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        form.requestSubmit()
      }
    })
    keyInput.addEventListener('input', () => {
      const slug = this.getAttribute('slug') ?? ''
      if (slug) localStorage.setItem(KEY_STORAGE_PREFIX + slug, keyInput.value)
    })
    // Silence unused warning
    void sendBtn
  }

  private updateKeyFromStorage(): void {
    const slug = this.getAttribute('slug') ?? ''
    if (!slug) return
    const attrKey = this.getAttribute('api-key')
    if (attrKey) {
      this.elements.keyInput.value = attrKey
    } else {
      const stored = localStorage.getItem(KEY_STORAGE_PREFIX + slug) ?? ''
      if (stored) this.elements.keyInput.value = stored
    }
  }

  private async checkReady(): Promise<void> {
    this.elements.status.textContent = 'connecting…'
    try {
      const res = await fetch(`${this.host}/health`, { method: 'GET', signal: AbortSignal.timeout(4000) })
      if (!res.ok) throw new Error(`health ${res.status}`)
      this.elements.status.textContent = 'ready'
      this.dispatchEvent(new CustomEvent('tangle-agent:ready', {
        detail: { slug: this.getAttribute('slug') ?? '', host: this.host },
      }))
    } catch (err) {
      this.elements.status.textContent = 'offline'
      this.dispatchEvent(new CustomEvent('tangle-agent:error', {
        detail: { error: err instanceof Error ? err.message : String(err) },
      }))
    }
  }

  private appendMsg(m: ChatMessage): HTMLDivElement {
    const div = document.createElement('div')
    div.className = `msg ${m.role}`
    div.textContent = m.content
    this.elements.messages.appendChild(div)
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight
    if (m.role !== 'system') {
      this.dispatchEvent(new CustomEvent('tangle-agent:message', { detail: { role: m.role, content: m.content } }))
    }
    return div
  }

  private async submit(content: string): Promise<void> {
    if (!content) return
    const key = this.apiKey
    if (!key) {
      this.renderError('Paste your sk-tan-* key first.')
      return
    }
    this.appendMsg({ role: 'user', content })
    this.history.push({ role: 'user', content })
    const assistantNode = this.appendMsg({ role: 'assistant', content: '…' })
    this.elements.sendBtn.disabled = true
    this.abortController?.abort()
    this.abortController = new AbortController()
    try {
      const full = await this.stream(key, assistantNode, this.abortController.signal)
      if (full) {
        this.history.push({ role: 'assistant', content: full })
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      assistantNode.textContent = `Error: ${error}`
      assistantNode.className = 'msg error'
      this.dispatchEvent(new CustomEvent('tangle-agent:error', { detail: { error } }))
    } finally {
      this.elements.sendBtn.disabled = false
      this.elements.input.focus()
    }
  }

  private async stream(key: string, node: HTMLDivElement, signal: AbortSignal): Promise<string> {
    const model = this.getAttribute('model') ?? 'anthropic/claude-sonnet-4-6'
    const res = await fetch(`${this.host}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: this.history, stream: true }),
      signal,
    })
    if (!res.ok) {
      const body = await res.text()
      throw Object.assign(new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`), { status: res.status })
    }
    if (!res.body) throw new Error('no response body')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let full = ''
    node.textContent = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '' || payload === '[DONE]') continue
        try {
          const event = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> }
          const delta = event.choices?.[0]?.delta?.content
          if (typeof delta === 'string') {
            full += delta
            node.textContent = full
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight
          }
        } catch {
          // tolerate malformed SSE chunks
        }
      }
    }
    return full
  }
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function cssSafe(v: string): string {
  return /^[0-9a-zA-Z%.\- ]+$/.test(v) ? v : '560px'
}

/** Registers the `<tangle-agent>` custom element. Safe to call multiple times. */
export function defineTangleAgent(tag = 'tangle-agent'): void {
  if (typeof customElements === 'undefined') return
  if (customElements.get(tag)) return
  customElements.define(tag, TangleAgentElement)
}

// Types for tsserver when consumers use `customElements.get('tangle-agent')` patterns
declare global {
  interface HTMLElementTagNameMap {
    'tangle-agent': TangleAgentElement
  }
}
