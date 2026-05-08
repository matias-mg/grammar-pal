import { useEffect, useState } from "react"

import { strings } from "./lib/i18n"
import { getSettings, onSettingsChange, setSettings } from "./lib/storage"
import type { Settings } from "./lib/types"

function IndexPopup() {
  const [settings, setLocal] = useState<Settings | null>(null)

  useEffect(() => {
    void getSettings().then(setLocal)
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

export default IndexPopup
