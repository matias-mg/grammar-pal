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
    right: 16px;
    bottom: 16px;
    width: 56px;
    height: 56px;
    pointer-events: auto;
    cursor: default;
    user-select: none;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.18));
  }
  .pet svg { width: 100%; height: 100%; display: block; }
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
