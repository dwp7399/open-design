import { describe, expect, it, vi } from 'vitest';

import {
  URL_PREVIEW_FIRST_LOAD_GRACE_MS,
  createFirstLoadRevealScheduler,
} from '../../src/components/url-preview-first-load-reveal';

function setup() {
  vi.useFakeTimers();
  const reveal = vi.fn();
  const scheduler = createFirstLoadRevealScheduler({ reveal });
  return { reveal, scheduler };
}

describe('createFirstLoadRevealScheduler', () => {
  it('reveals one grace period after DOM ready when load never arrives', () => {
    const { reveal, scheduler } = setup();
    scheduler.domReady();
    vi.advanceTimersByTime(URL_PREVIEW_FIRST_LOAD_GRACE_MS - 1);
    expect(reveal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reveal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('reveals at load inside the grace period, once', () => {
    const { reveal, scheduler } = setup();
    scheduler.domReady();
    vi.advanceTimersByTime(300);
    scheduler.loaded();
    expect(reveal).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(URL_PREVIEW_FIRST_LOAD_GRACE_MS);
    expect(reveal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does not restart the grace period on repeated DOM-ready signals', () => {
    const { reveal, scheduler } = setup();
    scheduler.domReady();
    vi.advanceTimersByTime(800);
    scheduler.domReady();
    vi.advanceTimersByTime(URL_PREVIEW_FIRST_LOAD_GRACE_MS - 800);
    expect(reveal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('drops a pending reveal on cancel', () => {
    const { reveal, scheduler } = setup();
    scheduler.domReady();
    scheduler.cancel();
    vi.advanceTimersByTime(URL_PREVIEW_FIRST_LOAD_GRACE_MS * 2);
    expect(reveal).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
