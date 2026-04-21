"use strict";var TangleAgent=(()=>{var m=Object.defineProperty;var x=Object.getOwnPropertyDescriptor;var E=Object.getOwnPropertyNames;var w=Object.prototype.hasOwnProperty;var k=(a,e,t,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of E(e))!w.call(a,n)&&n!==t&&m(a,n,{get:()=>e[n],enumerable:!(r=x(e,n))||r.enumerable});return a};var T=a=>k(m({},"__esModule",{value:!0}),a);var C={};var M=`
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
`,i="tangle.agent.embed.key:",h=class extends HTMLElement{static observedAttributes=["slug","host","api-key","model","theme","height","welcome"];shadow;history=[];abortController;elements;constructor(){super(),this.shadow=this.attachShadow({mode:"open"})}connectedCallback(){if(this.render(),this.bindEvents(),this.updateKeyFromStorage(),!this.getAttribute("slug")){this.renderError('tangle-agent: missing required attribute "slug"');return}this.checkReady()}disconnectedCallback(){this.abortController?.abort()}attributeChangedCallback(e,t,r){t!==r&&(e==="height"&&this.elements&&(this.elements.root.style.height=r??"560px"),e==="welcome"&&this.elements&&this.renderInitialBanner(),e==="slug"&&this.elements&&(this.clear(),this.checkReady()))}async send(e){e.trim()&&await this.submit(e.trim())}clear(){this.history=[],this.elements&&(this.elements.messages.innerHTML="",this.renderInitialBanner())}setApiKey(e){this.elements&&(this.elements.keyInput.value=e);let t=this.getAttribute("slug")??"";t&&localStorage.setItem(i+t,e)}get host(){let e=this.getAttribute("host");return e?e.replace(/\/$/,""):`https://${this.getAttribute("slug")??""}.tangle.app`}get apiKey(){let e=this.getAttribute("api-key");if(e)return e;let t=this.getAttribute("slug")??"";return this.elements?.keyInput.value||localStorage.getItem(i+t)||""}render(){let e=this.getAttribute("height")??"560px";this.shadow.innerHTML=`
      <style>${M}</style>
      <div class="wrap" part="root" style="height:${A(e)};">
        <header part="header">
          <div>
            <div class="title" part="title">${S(this.getAttribute("slug")??"agent")}</div>
            <span class="status" part="status">\u2026</span>
          </div>
          <input class="key" part="key-input" type="password" placeholder="sk-tan-\u2026" autocomplete="off" spellcheck="false">
        </header>
        <div class="messages" part="messages" role="log" aria-live="polite"></div>
        <form class="composer" part="composer">
          <textarea part="input" rows="1" placeholder="Message\u2026"></textarea>
          <button type="submit" part="send">Send</button>
        </form>
      </div>
    `;let t=this.shadow.querySelector(".wrap");this.elements={root:t,messages:this.shadow.querySelector(".messages"),input:this.shadow.querySelector("textarea"),sendBtn:this.shadow.querySelector("button"),keyInput:this.shadow.querySelector(".key"),status:this.shadow.querySelector(".status")},this.renderInitialBanner()}renderInitialBanner(){if(!this.elements)return;let e=this.getAttribute("welcome")??`Ask ${this.getAttribute("slug")??"the agent"} anything. Paste a sk-tan-* key above to begin.`;this.elements.messages.innerHTML="",this.appendMsg({role:"system",content:e})}renderError(e){if(!this.elements)return;let t=document.createElement("div");t.className="msg error",t.textContent=e,this.elements.messages.appendChild(t)}bindEvents(){let{input:e,sendBtn:t,keyInput:r}=this.elements,n=this.shadow.querySelector("form");n.addEventListener("submit",s=>{s.preventDefault(),this.submit(e.value.trim()),e.value="",e.style.height="auto"}),e.addEventListener("input",()=>{e.style.height="auto",e.style.height=`${Math.min(e.scrollHeight,160)}px`}),e.addEventListener("keydown",s=>{s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),n.requestSubmit())}),r.addEventListener("input",()=>{let s=this.getAttribute("slug")??"";s&&localStorage.setItem(i+s,r.value)})}updateKeyFromStorage(){let e=this.getAttribute("slug")??"";if(!e)return;let t=this.getAttribute("api-key");if(t)this.elements.keyInput.value=t;else{let r=localStorage.getItem(i+e)??"";r&&(this.elements.keyInput.value=r)}}async checkReady(){this.elements.status.textContent="connecting\u2026";try{let e=await fetch(`${this.host}/health`,{method:"GET",signal:AbortSignal.timeout(4e3)});if(!e.ok)throw new Error(`health ${e.status}`);this.elements.status.textContent="ready",this.dispatchEvent(new CustomEvent("tangle-agent:ready",{detail:{slug:this.getAttribute("slug")??"",host:this.host}}))}catch(e){this.elements.status.textContent="offline",this.dispatchEvent(new CustomEvent("tangle-agent:error",{detail:{error:e instanceof Error?e.message:String(e)}}))}}appendMsg(e){let t=document.createElement("div");return t.className=`msg ${e.role}`,t.textContent=e.content,this.elements.messages.appendChild(t),this.elements.messages.scrollTop=this.elements.messages.scrollHeight,e.role!=="system"&&this.dispatchEvent(new CustomEvent("tangle-agent:message",{detail:{role:e.role,content:e.content}})),t}async submit(e){if(!e)return;let t=this.apiKey;if(!t){this.renderError("Paste your sk-tan-* key first.");return}this.appendMsg({role:"user",content:e}),this.history.push({role:"user",content:e});let r=this.appendMsg({role:"assistant",content:"\u2026"});this.elements.sendBtn.disabled=!0,this.abortController?.abort(),this.abortController=new AbortController;try{let n=await this.stream(t,r,this.abortController.signal);n&&this.history.push({role:"assistant",content:n})}catch(n){let s=n instanceof Error?n.message:String(n);r.textContent=`Error: ${s}`,r.className="msg error",this.dispatchEvent(new CustomEvent("tangle-agent:error",{detail:{error:s}}))}finally{this.elements.sendBtn.disabled=!1,this.elements.input.focus()}}async stream(e,t,r){let n=this.getAttribute("model")??"anthropic/claude-sonnet-4-6",s=await fetch(`${this.host}/v1/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:n,messages:this.history,stream:!0}),signal:r});if(!s.ok){let d=await s.text();throw Object.assign(new Error(`HTTP ${s.status}: ${d.slice(0,200)}`),{status:s.status})}if(!s.body)throw new Error("no response body");let b=s.body.getReader(),v=new TextDecoder,o="",l="";for(t.textContent="";;){let{done:d,value:y}=await b.read();if(d)break;o+=v.decode(y,{stream:!0});let u=o.split(`
`);o=u.pop()??"";for(let c of u){if(!c.startsWith("data:"))continue;let g=c.slice(5).trim();if(!(g===""||g==="[DONE]"))try{let p=JSON.parse(g).choices?.[0]?.delta?.content;typeof p=="string"&&(l+=p,t.textContent=l,this.elements.messages.scrollTop=this.elements.messages.scrollHeight)}catch{}}}return l}};function S(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function A(a){return/^[0-9a-zA-Z%.\- ]+$/.test(a)?a:"560px"}function f(a="tangle-agent"){typeof customElements>"u"||customElements.get(a)||customElements.define(a,h)}f();return T(C);})();
