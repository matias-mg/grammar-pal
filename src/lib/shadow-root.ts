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
    border-bottom: 3px solid currentColor;
    border-radius: 1px;
  }
  .u--grammar { color: var(--gp-grammar); }
  .u--style   { color: var(--gp-style); }
  .u--other   { color: var(--gp-other); }

  @keyframes gp-polish-flow {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  .u--polish {
    border-bottom: none;
    background-image: linear-gradient(
      270deg,
      #4285F4, #9B72CB, #D96570, #F9AB00, #4285F4
    );
    background-size: 200% 100%;
    background-repeat: repeat-x;
    border-radius: 1px;
    opacity: 0.85;
    animation: gp-polish-flow 3s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .u--polish { animation: none; }
  }

  .polish-popover {
    position: fixed;
    pointer-events: auto;
    background: #ffffff;
    color: #1f2328;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
    padding: 10px;
    max-width: 320px;
    font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    z-index: 2147483647;
  }
  .polish-popover__diff {
    margin: 0 0 6px 0;
    word-break: break-word;
    font-size: 13px;
  }
  .polish-popover__original {
    color: #6e7781;
    text-decoration: line-through;
  }
  .polish-popover__arrow {
    color: #6e7781;
    margin: 0 6px;
  }
  .polish-popover__replacement {
    color: #1f2328;
    font-weight: 500;
  }
  .polish-popover__reason {
    margin: 0 0 8px 0;
    color: #57606a;
    font-size: 12px;
  }
  .polish-popover__actions {
    display: flex;
    gap: 6px;
  }
  .polish-popover__btn {
    background: #f6f8fa;
    color: #1f2328;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 4px 12px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .polish-popover__btn:hover { background: #eef1f4; }
  .polish-popover__btn--primary {
    background: #1f6feb;
    border-color: #1f6feb;
    color: #ffffff;
  }
  .polish-popover__btn--primary:hover { background: #1858c4; }

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

  @keyframes gp-polish-pulse {
    0%, 100% { transform: scale(0.72); opacity: 0.52; }
    50% { transform: scale(1); opacity: 1; }
  }

  .polish-loading {
    position: fixed;
    pointer-events: none;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255, 255, 255, 0.96);
    color: #1f2328;
    border: 1px solid #d0d7de;
    border-radius: 999px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.14);
    padding: 6px 10px;
    font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    z-index: 2147483647;
    white-space: nowrap;
  }
  .polish-loading::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4285f4;
    box-shadow: 9px 0 0 #d96570, 18px 0 0 #f9ab00;
    margin-right: 18px;
    transform-origin: center;
    animation: gp-polish-pulse 900ms ease-in-out infinite;
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
