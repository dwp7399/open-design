/**
 * When the URL-load first-load cover comes off.
 *
 * The cover exists so a preview whose navigation is still queued does not
 * read as a dead white pane. Once the artifact's own document has parsed,
 * that risk is gone, so the cover must not wait for the iframe `load` event:
 * `load` waits for every subresource, including each `<video>`'s first
 * frame, so one slow image or CDN video holds an already-painted page
 * behind the spinner for as long as it takes to download.
 *
 * Invariant: the cover comes off at whichever happens first —
 * - the document's `load` event, or
 * - `graceMs` after the document reported DOM ready.
 *
 * The grace period keeps the common case unchanged. A page whose assets
 * arrive within it still reveals fully loaded, in one step.
 */
export const URL_PREVIEW_FIRST_LOAD_GRACE_MS = 1200;

export interface FirstLoadRevealScheduler {
  /** The artifact document finished parsing (DOMContentLoaded). */
  domReady(): void;
  /** The iframe fired `load`. */
  loaded(): void;
  /** Drop any pending reveal, e.g. when the previewed URL changes. */
  cancel(): void;
}

export function createFirstLoadRevealScheduler(options: {
  reveal: () => void;
  graceMs?: number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}): FirstLoadRevealScheduler {
  const graceMs = options.graceMs ?? URL_PREVIEW_FIRST_LOAD_GRACE_MS;
  const setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
  const clearTimer = options.clearTimer
    ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let pending: unknown = null;

  const cancel = () => {
    if (pending === null) return;
    clearTimer(pending);
    pending = null;
  };

  return {
    domReady() {
      if (pending !== null) return;
      pending = setTimer(() => {
        pending = null;
        options.reveal();
      }, graceMs);
    },
    loaded() {
      cancel();
      options.reveal();
    },
    cancel,
  };
}
