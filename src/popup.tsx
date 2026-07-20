import { useEffect, useState } from "react"

import {
  getPolishBackend,
  type PolishBackendKind
} from "./lib/engine-polish"
import { strings } from "./lib/i18n"
import { getSettings, onSettingsChange, setSettings } from "./lib/storage"
import type { Settings } from "./lib/types"

const isEdge =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Edg/")

function IndexPopup() {
  const [settings, setLocal] = useState<Settings | null>(null)
  const [backend, setBackend] = useState<PolishBackendKind>("workers-ai")

  useEffect(() => {
    void getSettings().then(setLocal)
    void getPolishBackend().then(setBackend)
    const unsub = onSettingsChange(setLocal)
    return unsub
  }, [])

  if (!settings) {
    return (
      <main className="gp-popup">
        <style>{popupCss}</style>
        <section className="gp-shell" aria-busy="true">
          <header className="gp-header">
            <span className="gp-mark" aria-hidden="true" />
            <h1>{strings.popupTitle}</h1>
          </header>
          <p className="gp-hint">{strings.loading}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="gp-popup">
      <style>{popupCss}</style>
      <section className="gp-shell">
        <header className="gp-header">
          <span className="gp-mark" aria-hidden="true" />
          <div>
            <h1>{strings.popupTitle}</h1>
            <p>{strings.popupFooter}</p>
          </div>
          <label className="gp-enable-pill">
            <span>{strings.enabledLabel}</span>
            <span className="gp-switch gp-switch--small">
              <input
                className="gp-switch__input"
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => {
                  void setSettings({ enabled: e.target.checked })
                }}
              />
              <span className="gp-switch__track" aria-hidden="true">
                <span className="gp-switch__thumb" />
              </span>
            </span>
          </label>
        </header>

        <fieldset className="gp-mode" disabled={!settings.enabled}>
          <legend>{strings.modeLabel}</legend>
          <div className="gp-choice-grid">
            <label className="gp-choice">
              <input
                className="gp-choice__input"
                type="radio"
                name="mode"
                value="formal"
                checked={settings.mode === "formal"}
                onChange={() => {
                  void setSettings({ mode: "formal" })
                }}
              />
              <span className="gp-choice__card">
                <span className="gp-choice__heading">
                  <span className="gp-choice__dot" aria-hidden="true" />
                  <span>{strings.modeFormal}</span>
                </span>
                <span className="gp-choice__description">
                  {strings.modeFormalDescription}
                </span>
              </span>
            </label>
            <label className="gp-choice">
              <input
                className="gp-choice__input"
                type="radio"
                name="mode"
                value="chill"
                checked={settings.mode === "chill"}
                onChange={() => {
                  void setSettings({ mode: "chill" })
                }}
              />
              <span className="gp-choice__card">
                <span className="gp-choice__heading">
                  <span className="gp-choice__dot" aria-hidden="true" />
                  <span>{strings.modeChill}</span>
                </span>
                <span className="gp-choice__description">
                  {strings.modeChillDescription}
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <section className="gp-pal">
          <div className="gp-section-kicker">{strings.palLabel}</div>
          <div className="gp-pal__row">
            <span className="gp-pal__avatar" aria-hidden="true" />
            <span className="gp-pal__copy">
              <span className="gp-label">{strings.palCurrentName}</span>
              <span>{strings.palCurrentDescription}</span>
            </span>
            <button className="gp-pal__soon" type="button" disabled>
              {strings.palPickerSoon}
            </button>
          </div>
        </section>

        <section className="gp-polish">
          <label className="gp-toggle-row gp-toggle-row--compact">
            <span className="gp-label">{strings.polishLabel}</span>
            <span className="gp-switch">
              <input
                className="gp-switch__input"
                type="checkbox"
                checked={settings.polishEnabled}
                onChange={(e) => {
                  void setSettings({ polishEnabled: e.target.checked })
                }}
              />
              <span className="gp-switch__track" aria-hidden="true">
                <span className="gp-switch__thumb" />
              </span>
            </span>
          </label>
          {backend === "prompt-api" ? (
            <p className="gp-privacy gp-privacy--local">
              {strings.popupPolishPrivacyLocal}
            </p>
          ) : (
            <div className="gp-cloud-card">
              <span className="gp-cloud-card__badge">
                {strings.polishCloudBadge}
              </span>
              <p className="gp-cloud-card__title">{strings.polishCloudTitle}</p>
              <p className="gp-cloud-card__body">{strings.polishCloudBody}</p>
              <p className="gp-privacy">
                {strings.polishPrivacyPrefix}
                <a
                  href={strings.polishPrivacyUrl}
                  target="_blank"
                  rel="noopener noreferrer">
                  {strings.polishPrivacyLink}
                </a>
                {strings.polishPrivacySuffix}
              </p>
              {isEdge && (
                <p className="gp-privacy">
                  {strings.edgeLocalAiHintPrefix}
                  <a
                    href={strings.edgeLocalAiHintCanaryUrl}
                    target="_blank"
                    rel="noopener noreferrer">
                    {strings.edgeLocalAiHintCanaryLink}
                  </a>
                  {strings.edgeLocalAiHintMiddle}
                  <a
                    href={strings.edgeLocalAiHintFlagUrl}
                    onClick={(e) => {
                      e.preventDefault()
                      chrome.tabs.create({ url: strings.edgeLocalAiHintFlagUrl })
                    }}>
                    {strings.edgeLocalAiHintFlagLink}
                  </a>
                  {strings.edgeLocalAiHintSuffix}
                </p>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

const popupCss = `
  :root {
    color-scheme: dark;
  }

  html,
  body,
  #__plasmo {
    margin: 0;
    width: 344px;
    min-height: 100%;
    background: #0f1118;
  }

  * {
    box-sizing: border-box;
  }

  @keyframes gp-popup-border-flow {
    0% { background-position: 0 0, 200% 50%, 0 0; }
    100% { background-position: 0 0, 0% 50%, 0 0; }
  }

  .gp-popup {
    --gp-bg: #0f1118;
    --gp-panel: rgba(18, 20, 27, 0.96);
    --gp-line: rgba(255, 255, 255, 0.14);
    --gp-text: #ffffff;
    --gp-muted: rgba(255, 255, 255, 0.68);
    --gp-faint: rgba(255, 255, 255, 0.48);
    --gp-blue: #1f6feb;
    --gp-blue-soft: rgba(31, 111, 235, 0.2);
    --gp-amber: #f5a524;
    --gp-green: #10b981;
    --gp-polish-gradient: linear-gradient(
      270deg,
      #4285F4, #9B72CB, #D96570, #F9AB00, #4285F4
    );
    width: 344px;
    min-height: 100%;
    padding: 10px;
    background:
      radial-gradient(circle at 12% 0%, rgba(66, 133, 244, 0.22), transparent 32%),
      radial-gradient(circle at 100% 18%, rgba(249, 171, 0, 0.16), transparent 30%),
      var(--gp-bg);
    color: var(--gp-text);
    font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .gp-shell {
    position: relative;
    overflow: hidden;
    border: 1.5px solid transparent;
    border-radius: 12px;
    padding: 15px;
    background:
      linear-gradient(var(--gp-panel), var(--gp-panel)) padding-box,
      var(--gp-polish-gradient) border-box,
      linear-gradient(135deg, rgba(255, 255, 255, 0.09), transparent 42%) padding-box;
    background-size: 100% 100%, 200% 100%, 100% 100%;
    background-position: 0 0, 200% 50%, 0 0;
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.38);
    animation: gp-popup-border-flow 8s linear infinite;
  }

  .gp-shell::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 18px 18px;
    -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent 72%);
    mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent 72%);
  }

  .gp-header,
  .gp-toggle-row,
  .gp-mode,
  .gp-pal,
  .gp-polish {
    position: relative;
  }

  .gp-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 12px;
  }

  .gp-header > div {
    flex: 1 1 auto;
    min-width: 0;
  }

  .gp-mark {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border: 1px solid rgba(245, 165, 36, 0.42);
    border-radius: 10px;
    background:
      radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.9) 0 7%, transparent 8%),
      linear-gradient(135deg, rgba(66, 133, 244, 0.9), rgba(155, 114, 203, 0.78) 42%, rgba(245, 165, 36, 0.9));
    box-shadow:
      0 0 0 4px rgba(245, 165, 36, 0.12),
      0 8px 18px rgba(0, 0, 0, 0.28);
  }

  .gp-header h1 {
    margin: 0;
    color: var(--gp-text);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .gp-header p,
  .gp-hint {
    margin: 1px 0 0;
    color: var(--gp-muted);
    font-size: 11.5px;
  }

  .gp-enable-pill {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 6px 5px 9px;
    border: 1px solid var(--gp-line);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.055);
    color: rgba(255, 255, 255, 0.78);
    font-size: 11px;
    font-weight: 650;
    cursor: pointer;
  }

  .gp-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    width: 100%;
    padding: 12px;
    border: 1px solid var(--gp-line);
    border-radius: 9px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035));
    cursor: pointer;
  }

  .gp-toggle-row--compact {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .gp-label {
    color: var(--gp-text);
    font-size: 13px;
    font-weight: 650;
  }

  .gp-switch {
    flex: 0 0 auto;
    position: relative;
    display: inline-flex;
    width: 42px;
    height: 24px;
  }

  .gp-switch--small {
    width: 34px;
    height: 20px;
  }

  .gp-switch__input,
  .gp-choice__input {
    position: absolute;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: pointer;
  }

  .gp-switch__track {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }

  .gp-switch__thumb {
    position: absolute;
    left: 4px;
    top: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 2px 7px rgba(0, 0, 0, 0.35);
    transition: transform 180ms ease, background 180ms ease;
  }

  .gp-switch--small .gp-switch__thumb {
    left: 3px;
    top: 3px;
    width: 14px;
    height: 14px;
  }

  .gp-switch__input:checked + .gp-switch__track {
    border-color: rgba(66, 133, 244, 0.92);
    background: linear-gradient(135deg, var(--gp-blue), #4285f4);
    box-shadow: 0 0 0 3px var(--gp-blue-soft);
  }

  .gp-switch__input:checked + .gp-switch__track .gp-switch__thumb {
    transform: translateX(18px);
    background: #ffffff;
  }

  .gp-switch--small .gp-switch__input:checked + .gp-switch__track .gp-switch__thumb {
    transform: translateX(14px);
  }

  .gp-switch__input:focus-visible + .gp-switch__track,
  .gp-choice__input:focus-visible + .gp-choice__card {
    outline: 2px solid rgba(124, 196, 255, 0.95);
    outline-offset: 2px;
  }

  .gp-mode {
    margin: 0 0 12px;
    padding: 0;
    border: 0;
  }

  .gp-mode:disabled {
    opacity: 0.48;
  }

  .gp-mode legend {
    margin: 0 0 8px;
    padding: 0;
    color: var(--gp-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .gp-section-kicker {
    margin: 0 0 8px;
    color: var(--gp-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .gp-choice-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .gp-choice {
    position: relative;
    min-width: 0;
    cursor: pointer;
  }

  .gp-choice__card {
    display: grid;
    gap: 5px;
    min-height: 76px;
    padding: 10px 11px;
    border: 1px solid var(--gp-line);
    border-radius: 9px;
    color: rgba(255, 255, 255, 0.72);
    background: rgba(255, 255, 255, 0.045);
    transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
  }

  .gp-choice__heading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--gp-text);
    font-weight: 650;
  }

  .gp-choice__description {
    color: var(--gp-faint);
    font-size: 11px;
    line-height: 1.32;
  }

  .gp-choice__dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.055);
  }

  .gp-choice__input:checked + .gp-choice__card {
    border-color: rgba(245, 165, 36, 0.76);
    background: linear-gradient(135deg, rgba(245, 165, 36, 0.17), rgba(66, 133, 244, 0.1));
    color: var(--gp-text);
  }

  .gp-choice__input:checked + .gp-choice__card .gp-choice__dot {
    background: var(--gp-amber);
    box-shadow: 0 0 0 3px rgba(245, 165, 36, 0.18);
  }

  .gp-pal {
    margin: 0 0 12px;
  }

  .gp-pal__row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: 1px solid rgba(245, 165, 36, 0.2);
    border-radius: 9px;
    background:
      linear-gradient(135deg, rgba(245, 165, 36, 0.11), rgba(255, 255, 255, 0.035)),
      rgba(255, 255, 255, 0.035);
  }

  .gp-pal__avatar {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border: 1px solid rgba(245, 165, 36, 0.42);
    border-radius: 50%;
    background:
      radial-gradient(circle at 36% 35%, #fff6c7 0 9%, transparent 10%),
      radial-gradient(circle at 64% 35%, #fff6c7 0 9%, transparent 10%),
      radial-gradient(ellipse at 50% 64%, #1f2328 0 15%, transparent 16%),
      linear-gradient(145deg, #fde68a, #f5a524 56%, #f87171);
    box-shadow: 0 0 0 4px rgba(245, 165, 36, 0.12);
  }

  .gp-pal__copy {
    min-width: 0;
    display: grid;
    gap: 1px;
    flex: 1 1 auto;
    color: var(--gp-faint);
    font-size: 11px;
  }

  .gp-pal__soon {
    flex: 0 0 auto;
    max-width: 78px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    padding: 5px 8px;
    background: rgba(255, 255, 255, 0.045);
    color: rgba(255, 255, 255, 0.45);
    font: inherit;
    font-size: 10.5px;
    line-height: 1.15;
    cursor: not-allowed;
  }

  .gp-polish {
    padding: 12px;
    border: 1px solid rgba(66, 133, 244, 0.22);
    border-radius: 9px;
    background:
      linear-gradient(135deg, rgba(66, 133, 244, 0.13), rgba(155, 114, 203, 0.08)),
      rgba(255, 255, 255, 0.035);
  }

  .gp-cloud-card {
    margin: 10px 0 0;
    padding: 10px;
    border: 1px solid rgba(245, 165, 36, 0.28);
    border-radius: 8px;
    background:
      linear-gradient(135deg, rgba(245, 165, 36, 0.14), rgba(66, 133, 244, 0.08)),
      rgba(255, 255, 255, 0.035);
  }

  .gp-cloud-card__badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--gp-amber);
    font-size: 10.5px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .gp-cloud-card__badge::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 3px rgba(245, 165, 36, 0.15);
  }

  .gp-cloud-card__title {
    margin: 5px 0 3px;
    color: var(--gp-text);
    font-size: 12.5px;
    font-weight: 700;
  }

  .gp-cloud-card__body {
    margin: 0;
    color: rgba(255, 255, 255, 0.65);
    font-size: 11px;
    line-height: 1.42;
  }

  .gp-privacy {
    margin: 7px 0 0;
    color: var(--gp-faint);
    font-size: 11px;
    line-height: 1.4;
  }

  .gp-privacy--local {
    color: rgba(255, 255, 255, 0.64);
  }

  .gp-privacy--local::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    margin: 0 6px 1px 0;
    border-radius: 50%;
    background: var(--gp-green);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  }

  .gp-privacy a {
    color: #7cc4ff;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .gp-privacy a:hover {
    color: #a8d8ff;
  }

  @media (prefers-reduced-motion: reduce) {
    .gp-shell {
      animation: none;
    }

    .gp-switch__track,
    .gp-switch__thumb,
    .gp-choice__card {
      transition: none;
    }
  }
`

export default IndexPopup
