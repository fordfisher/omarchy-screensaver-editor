export const STORAGE_KEY = "omarchy.screensaver-studio.versions.v1";
export const MAX_VERSIONS = 24;
export const WORDMARK_VERSION_ID = "pinned-omarchy-wordmark";

export type ScreensaverVersion = {
  id: string;
  label: string;
  createdAt: number;
  text: string;
  pinned?: boolean;
};

export type VersionDraft = {
  id?: string;
  label: string;
  createdAt: number;
  text: string;
  pinned?: boolean;
};

function newId(createdAt: number): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `v-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseVersions(raw: string | null | undefined): ScreensaverVersion[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: ScreensaverVersion[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (typeof rec.id !== "string" || typeof rec.label !== "string") continue;
      if (typeof rec.createdAt !== "number" || typeof rec.text !== "string") continue;
      out.push({
        id: rec.id,
        label: rec.label,
        createdAt: rec.createdAt,
        text: rec.text,
        pinned: rec.pinned === true,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeVersions(list: ScreensaverVersion[]): string {
  return JSON.stringify(list);
}

export function ensurePinned(
  list: ScreensaverVersion[],
  pinned: ScreensaverVersion,
): ScreensaverVersion[] {
  const others = list.filter((item) => item.id !== pinned.id && !item.pinned);
  return [...others, { ...pinned, pinned: true }];
}

export function pushVersion(
  list: ScreensaverVersion[],
  draft: VersionDraft,
  limit = MAX_VERSIONS,
): ScreensaverVersion[] {
  const pinned = list.filter((item) => item.pinned);
  const rest = list.filter((item) => !item.pinned);
  if (!draft.pinned && rest[0]?.text === draft.text) return list;
  const item: ScreensaverVersion = {
    id: draft.id ?? newId(draft.createdAt),
    label: draft.label,
    createdAt: draft.createdAt,
    text: draft.text,
    pinned: draft.pinned,
  };
  if (item.pinned) return ensurePinned(list, item);
  return [item, ...rest.filter((entry) => entry.id !== item.id)].slice(0, limit).concat(pinned);
}

export function dropVersion(
  list: ScreensaverVersion[],
  id: string,
): ScreensaverVersion[] {
  return list.filter((item) => item.id !== id || item.pinned);
}

/** screensaver-YYYYMMDD-HHMMSS.txt in UTC, so copies in Downloads don't clobber each other. */
export function versionFilename(createdAt: number, pinned = false): string {
  if (pinned) return "screensaver-omarchy.txt";
  const iso = new Date(createdAt)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "");
  return `screensaver-${iso.slice(0, 8)}-${iso.slice(9, 15)}.txt`;
}

export function formatVersionTime(createdAt: number): string {
  return new Date(createdAt).toLocaleString();
}

export function readStoredVersions(): ScreensaverVersion[] {
  try {
    return parseVersions(globalThis.localStorage?.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeStoredVersions(list: ScreensaverVersion[]): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, serializeVersions(list));
  } catch {
    /* private mode / quota */
  }
}
