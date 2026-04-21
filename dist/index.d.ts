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
interface TangleAgentAttrs {
    slug: string;
    host?: string;
    apiKey?: string;
    model?: string;
    theme?: 'dark' | 'light' | 'auto';
    height?: string;
    welcome?: string;
}
type TangleAgentEventMap = {
    'tangle-agent:ready': CustomEvent<{
        slug: string;
        host: string;
    }>;
    'tangle-agent:message': CustomEvent<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    'tangle-agent:error': CustomEvent<{
        error: string;
        status?: number;
    }>;
};
declare class TangleAgentElement extends HTMLElement {
    static observedAttributes: string[];
    private shadow;
    private history;
    private abortController?;
    private elements;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    send(text: string): Promise<void>;
    clear(): void;
    setApiKey(key: string): void;
    private get host();
    private get apiKey();
    private render;
    private renderInitialBanner;
    private renderError;
    private bindEvents;
    private updateKeyFromStorage;
    private checkReady;
    private appendMsg;
    private submit;
    private stream;
}
/** Registers the `<tangle-agent>` custom element. Safe to call multiple times. */
declare function defineTangleAgent(tag?: string): void;
declare global {
    interface HTMLElementTagNameMap {
        'tangle-agent': TangleAgentElement;
    }
}

export { type TangleAgentAttrs, TangleAgentElement, type TangleAgentEventMap, defineTangleAgent };
