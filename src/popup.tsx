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
  const [backend, setBackend] = useState<PolishBackendKind>("gemini")

  useEffect(() => {
    void getSettings().then(setLocal)
    void getPolishBackend().then(setBackend)
    const unsub = onSettingsChange(setLocal)
    return unsub
  }, [])

  if (!settings) {
    return (
      <main style={popupStyle}>
        <h1 style={titleStyle}>{strings.popupTitle}</h1>
        <p style={hintStyle}>{strings.loading}</p>
      </main>
    )
  }

  return (
    <main style={popupStyle}>
      <h1 style={titleStyle}>{strings.popupTitle}</h1>

      <label style={rowStyle}>
        <span>{strings.enabledLabel}</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => {
            void setSettings({ enabled: e.target.checked })
          }}
        />
      </label>

      <fieldset style={fieldsetStyle} disabled={!settings.enabled}>
        <legend style={legendStyle}>{strings.modeLabel}</legend>
        <label style={radioRow}>
          <input
            type="radio"
            name="mode"
            value="formal"
            checked={settings.mode === "formal"}
            onChange={() => {
              void setSettings({ mode: "formal" })
            }}
          />
          <span>{strings.modeFormal}</span>
        </label>
        <label style={radioRow}>
          <input
            type="radio"
            name="mode"
            value="chill"
            checked={settings.mode === "chill"}
            onChange={() => {
              void setSettings({ mode: "chill" })
            }}
          />
          <span>{strings.modeChill}</span>
        </label>
      </fieldset>

      <label style={rowStyle}>
        <span>{strings.polishLabel}</span>
        <input
          type="checkbox"
          checked={settings.polishEnabled}
          onChange={(e) => {
            void setSettings({ polishEnabled: e.target.checked })
          }}
        />
      </label>
      {backend === "prompt-api" ? (
        <p style={privacyNoteStyle}>{strings.popupPolishPrivacyLocal}</p>
      ) : (
        <>
          <p style={privacyNoteStyle}>
            {strings.polishPrivacyPrefix}
            <a href="#" style={privacyLinkStyle}>
              {strings.polishPrivacyLink}
            </a>
            {strings.polishPrivacySuffix}
          </p>
          {isEdge && (
            <p style={privacyNoteStyle}>
              {strings.edgeLocalAiHintPrefix}
              <a
                href={strings.edgeLocalAiHintCanaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={privacyLinkStyle}>
                {strings.edgeLocalAiHintCanaryLink}
              </a>
              {strings.edgeLocalAiHintMiddle}
              <a
                href={strings.edgeLocalAiHintFlagUrl}
                onClick={(e) => {
                  e.preventDefault()
                  chrome.tabs.create({ url: strings.edgeLocalAiHintFlagUrl })
                }}
                style={privacyLinkStyle}>
                {strings.edgeLocalAiHintFlagLink}
              </a>
              {strings.edgeLocalAiHintSuffix}
            </p>
          )}
        </>
      )}

      <p style={hintStyle}>{strings.popupFooter}</p>
    </main>
  )
}

const popupStyle: React.CSSProperties = {
  width: 260,
  padding: 16,
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  fontSize: 14,
  color: "#1f2328"
}

const titleStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: 16,
  fontWeight: 600
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "8px 0"
}

const fieldsetStyle: React.CSSProperties = {
  margin: "8px 0",
  padding: "6px 10px",
  border: "1px solid #d0d7de",
  borderRadius: 6
}

const legendStyle: React.CSSProperties = {
  padding: "0 4px",
  fontWeight: 600
}

const radioRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  margin: "4px 0"
}

const hintStyle: React.CSSProperties = {
  margin: "12px 0 0 0",
  fontSize: 12,
  color: "#57606a"
}

const privacyNoteStyle: React.CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 11,
  color: "#6e7781",
  lineHeight: 1.4
}

const privacyLinkStyle: React.CSSProperties = {
  color: "#6e7781",
  textDecoration: "underline"
}

export default IndexPopup
