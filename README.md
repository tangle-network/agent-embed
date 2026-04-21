# @tangle-network/agent-embed

Drop-in `<tangle-agent>` web component for embedding any Tangle
marketplace agent into any webpage.

## Quick start — script tag (no build step)

```html
<script src="https://unpkg.com/@tangle-network/agent-embed/dist/embed.js"></script>

<tangle-agent slug="tax-freelancer"></tangle-agent>
```

## Quick start — npm

```sh
npm install @tangle-network/agent-embed
```

```ts
import '@tangle-network/agent-embed'
```

```html
<tangle-agent slug="tax-freelancer"></tangle-agent>
```

Or call `defineTangleAgent()` explicitly with a custom tag name.

## Attributes

| Attribute  | Required | Default                        | Purpose                                   |
|------------|----------|--------------------------------|-------------------------------------------|
| `slug`     | yes      | —                              | Agent's marketplace slug                  |
| `host`     | no       | `https://<slug>.tangle.app`    | Override base host (BYO custom domain)    |
| `api-key`  | no       | —                              | `sk-tan-*` key; pass or let UI prompt     |
| `model`    | no       | `anthropic/claude-sonnet-4-6`  | Override default model                    |
| `theme`    | no       | `auto`                         | `dark` / `light` / `auto`                 |
| `height`   | no       | `560px`                        | CSS height                                |
| `welcome`  | no       | agent-specific                 | Override the welcome banner               |

## Events

- `tangle-agent:ready` — `{ slug, host }` after the `/health` check passes
- `tangle-agent:message` — `{ role, content }` on each user / assistant message
- `tangle-agent:error` — `{ error, status? }` on any failure

## Methods

- `el.send(text)` — send a message programmatically
- `el.clear()` — reset the conversation
- `el.setApiKey(key)` — update the `sk-tan-*` key at runtime

## Auth

The component validates the user's `sk-tan-*` key against the deployed
agent's `/v1/chat/completions` endpoint, which in turn validates against
`id.tangle.tools`. Keys are stored in `localStorage` per slug for
convenience — pass `api-key="..."` instead if you don't want that.

## Shadow DOM parts

Style from the outside via CSS `::part()`:

```css
tangle-agent::part(header) { background: black; }
tangle-agent::part(send) { background: magenta; }
```

Parts available: `root`, `header`, `title`, `status`, `key-input`,
`messages`, `composer`, `input`, `send`.
