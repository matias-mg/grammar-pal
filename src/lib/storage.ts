import { DEFAULT_SETTINGS, type Settings } from "./types"

const KEY = "settings"

export async function getSettings(): Promise<Settings> {
  const raw = await chrome.storage.local.get(KEY)
  const stored = raw[KEY] as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next: Settings = { ...(await getSettings()), ...patch }
  await chrome.storage.local.set({ [KEY]: next })
  return next
}

export function onSettingsChange(cb: (next: Settings) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: chrome.storage.AreaName
  ) => {
    if (area !== "local") return
    const change = changes[KEY]
    if (!change) return
    const newValue = change.newValue as Partial<Settings> | undefined
    cb({ ...DEFAULT_SETTINGS, ...(newValue ?? {}) })
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
