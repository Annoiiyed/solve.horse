/**
 * Reflect the selected level in the URL as `?level=<date>` so a selection is
 * shareable and survives reload. Validation against the catalogue is left to
 * the caller, keeping this module free of any dependency on the level data.
 */
const LEVEL_PARAM = "level";

/** The raw `level` query value, or null if absent. */
export const readLevelParam = (): string | null =>
  new URLSearchParams(window.location.search).get(LEVEL_PARAM);

/** Write the level into the URL without adding a history entry. */
export const writeLevelParam = (date: string): void => {
  const url = new URL(window.location.href);
  if (url.searchParams.get(LEVEL_PARAM) === date) return;
  url.searchParams.set(LEVEL_PARAM, date);
  window.history.replaceState(null, "", url);
};
