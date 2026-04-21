/**
 * Standalone bundle entry — auto-registers `<tangle-agent>` on load.
 * Built as IIFE for `<script src="https://tangle.app/embed.js">` drop-in use.
 */

import { defineTangleAgent } from './index'

defineTangleAgent()

export {}
