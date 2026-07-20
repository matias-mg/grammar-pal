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
    --gp-polish-gradient: linear-gradient(
      270deg,
      #4285F4, #9B72CB, #D96570, #F9AB00, #4285F4
    );
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
  .u--grammar,
  .u--style,
  .u--other {
    z-index: 2;
  }

  @keyframes gp-polish-flow {
    0%   { background-position: 200% 100%; }
    100% { background-position: 0% 100%; }
  }
  .u--polish {
    border-bottom: none;
    background: transparent;
    border-radius: 1px;
    opacity: 1;
    z-index: 3;
  }
  .u--polish::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -3px;
    height: 3px;
    background-image: var(--gp-polish-gradient);
    background-size: 200% 100%;
    background-repeat: repeat-x;
    border-radius: 1px;
    animation: gp-polish-flow 3s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .u--polish::after { animation: none; }
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

  @keyframes gp-polish-border-flow {
    0%   { background-position: 0 0, 200% 50%; }
    100% { background-position: 0 0, 0% 50%; }
  }

  .polish-loading {
    position: fixed;
    pointer-events: none;
    display: inline-flex;
    align-items: center;
    background:
      linear-gradient(rgba(18, 20, 27, 0.96), rgba(18, 20, 27, 0.96)) padding-box,
      var(--gp-polish-gradient) border-box;
    background-size: 100% 100%, 200% 100%;
    background-position: 0 0, 200% 50%;
    color: #ffffff;
    border: 1px solid transparent;
    border-radius: 999px;
    box-shadow: 0 7px 22px rgba(0,0,0,0.22);
    padding: 6px 11px;
    font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    z-index: 2147483647;
    white-space: nowrap;
    animation: gp-polish-border-flow 2.4s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .polish-loading { animation: none; }
  }

  .local-ai-modal {
    position: fixed;
    right: 16px;
    bottom: 16px;
    pointer-events: auto;
    background:
      linear-gradient(rgba(18, 20, 27, 0.97), rgba(18, 20, 27, 0.97)) padding-box,
      var(--gp-polish-gradient) border-box;
    background-size: 100% 100%, 200% 100%;
    background-position: 0 0, 200% 50%;
    color: #ffffff;
    border: 1.5px solid transparent;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.32);
    padding: 14px 16px;
    max-width: 320px;
    font: 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    z-index: 2147483647;
    animation: gp-polish-border-flow 6s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .local-ai-modal { animation: none; }
  }
  .local-ai-modal__title {
    margin: 0 0 6px 0;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
  }
  .local-ai-modal__body {
    margin: 0 0 10px 0;
    color: rgba(255, 255, 255, 0.78);
    font-size: 12.5px;
  }
  .local-ai-modal__body a {
    color: #7cc4ff;
    text-decoration: underline;
  }
  .local-ai-modal__body a:hover {
    color: #a8d8ff;
  }
  .local-ai-modal__note {
    margin: 0 0 12px 0;
    font-size: 11.5px;
    color: #f5a524;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .local-ai-modal__note::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 3px rgba(245, 165, 36, 0.18);
    flex: none;
  }
  .local-ai-modal__actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .local-ai-modal__btn {
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 999px;
    padding: 5px 14px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .local-ai-modal__btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }
  .local-ai-modal__btn--primary {
    background: #1f6feb;
    border-color: #1f6feb;
    color: #ffffff;
  }
  .local-ai-modal__btn--primary:hover {
    background: #1858c4;
    border-color: #1858c4;
  }
  .local-ai-modal__btn[disabled] {
    opacity: 0.6;
    cursor: progress;
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
