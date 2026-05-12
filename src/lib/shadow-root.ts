const HOST_ID = "grammar-pal-root"

let cachedRoot: ShadowRoot | null = null

const STYLES = `
  :host {
    all: initial;
  }
  .layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 2147483647;
    --gp-grammar: #e5484d;
    --gp-style:   #f5a524;
    --gp-other:   #3b82f6;
  }
  .u {
    position: fixed;
    pointer-events: auto;
    cursor: pointer;
    background: transparent;
    border-bottom: 2px solid currentColor;
    border-radius: 1px;
  }
  .u--grammar { color: var(--gp-grammar); }
  .u--style   { color: var(--gp-style); }
  .u--other   { color: var(--gp-other); }

  .popup {
    position: fixed;
    pointer-events: auto;
    background: #ffffff;
    color: #1f2328;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
    padding: 8px;
    font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    max-width: 320px;
    z-index: 2147483647;
  }
  .popup__msg {
    margin: 0 0 6px 0;
    font-size: 12px;
    color: #57606a;
  }
  .popup__btn {
    display: block;
    width: 100%;
    text-align: left;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 4px 8px;
    margin: 2px 0;
    font: inherit;
    cursor: pointer;
    color: #1f2328;
  }
  .popup__btn:hover { background: #eef1f4; }
  .popup__empty {
    margin: 0;
    color: #57606a;
    font-style: italic;
  }

  .pet {
    position: fixed;
    left: 0;
    top: 0;
    width: 56px;
    height: 56px;
    pointer-events: auto;
    cursor: default;
    user-select: none;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.18));
  }
  .pet__face { width: 100%; height: 100%; }
  .pet svg { width: 100%; height: 100%; display: block; }
  .pet__mode {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.5px solid #1f2328;
    box-sizing: border-box;
    background: #9ca3af;
  }
  .pet__mode--formal { background: #2563eb; }
  .pet__mode--chill  { background: #10b981; }

  .polish-panel {
    position: fixed;
    pointer-events: auto;
    background: #ffffff;
    color: #1f2328;
    border: 1px solid #d0d7de;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    padding: 0;
    font: 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    width: 360px;
    max-width: calc(100vw - 16px);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    max-height: 70vh;
  }
  .polish-panel__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #eaeef2;
    font-weight: 600;
  }
  .polish-panel__close {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 16px;
    color: #57606a;
    padding: 0 4px;
    line-height: 1;
  }
  .polish-panel__close:hover { color: #1f2328; }
  .polish-panel__body {
    overflow-y: auto;
    padding: 10px 12px;
  }
  .polish-panel__section-label {
    margin: 4px 0 6px 0;
    font-size: 11px;
    color: #57606a;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .polish-panel__preview {
    margin: 0 0 12px 0;
    padding: 8px 10px;
    background: #f6f8fa;
    border: 1px solid #eaeef2;
    border-radius: 6px;
    white-space: pre-wrap;
    max-height: 140px;
    overflow-y: auto;
    font-size: 12px;
    color: #1f2328;
  }
  .polish-card {
    border: 1px solid #eaeef2;
    border-radius: 6px;
    padding: 8px 10px;
    margin: 0 0 8px 0;
  }
  .polish-card--resolved {
    opacity: 0.55;
  }
  .polish-card__original {
    color: #57606a;
    text-decoration: line-through;
    word-break: break-word;
  }
  .polish-card__replacement {
    color: #1f2328;
    font-weight: 500;
    margin-top: 2px;
    word-break: break-word;
  }
  .polish-card__arrow {
    color: #6e7781;
    margin-right: 4px;
  }
  .polish-card__reason {
    color: #57606a;
    font-size: 12px;
    margin: 4px 0 6px 0;
  }
  .polish-card__actions {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }
  .polish-card__status {
    margin-top: 4px;
    font-size: 12px;
    color: #57606a;
    font-style: italic;
  }
  .polish-btn {
    background: #f6f8fa;
    color: #1f2328;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 4px 10px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .polish-btn:hover { background: #eef1f4; }
  .polish-btn--primary {
    background: #1f6feb;
    border-color: #1f6feb;
    color: #ffffff;
  }
  .polish-btn--primary:hover { background: #1858c4; }
  .polish-panel__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-top: 1px solid #eaeef2;
    gap: 8px;
  }

  .polish-toast {
    position: fixed;
    pointer-events: auto;
    background: rgba(31, 35, 40, 0.92);
    color: #ffffff;
    border-radius: 999px;
    padding: 6px 12px;
    font: 12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    box-shadow: 0 4px 14px rgba(0,0,0,0.22);
    z-index: 2147483647;
    max-width: 320px;
  }
`

export function getShadowRoot(): ShadowRoot {
  if (cachedRoot && cachedRoot.host.isConnected) return cachedRoot

  const existing = document.getElementById(HOST_ID)
  if (existing && existing.shadowRoot) {
    cachedRoot = existing.shadowRoot
    return cachedRoot
  }

  const host = existing ?? document.createElement("div")
  host.id = HOST_ID
  if (!existing) {
    host.style.all = "initial"
    document.documentElement.appendChild(host)
  }

  const root = host.attachShadow({ mode: "open" })
  const style = document.createElement("style")
  style.textContent = STYLES
  root.appendChild(style)

  const layer = document.createElement("div")
  layer.className = "layer"
  layer.dataset["role"] = "layer"
  root.appendChild(layer)

  cachedRoot = root
  return root
}

export function getOverlayLayer(): HTMLElement {
  const root = getShadowRoot()
  const layer = root.querySelector<HTMLElement>('[data-role="layer"]')
  if (!layer) throw new Error("grammar-pal: overlay layer missing")
  return layer
}
