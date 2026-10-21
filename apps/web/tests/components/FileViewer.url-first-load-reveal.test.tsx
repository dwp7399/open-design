// @vitest-environment jsdom
//
// The URL-load first-load cover must come off once the artifact document is
// ready, not at the iframe `load` event. `load` waits for every subresource,
// including each `<video>`'s first frame, so a page with a slow image or CDN
// video stayed behind "Loading…" long after it had painted (measured: DOM
// ready at ~0.7s, cover gone at ~11s for one 210 KB image served at 20 KB/s).

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileViewer } from '../../src/components/FileViewer';
import { URL_PREVIEW_FIRST_LOAD_GRACE_MS } from '../../src/components/url-preview-first-load-reveal';
import type { ProjectFile } from '../../src/types';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function htmlArtifact(): ProjectFile {
  return {
    name: 'gallery.html',
    path: 'gallery.html',
    type: 'file',
    size: 1024,
    mtime: 1710000000,
    kind: 'html',
    mime: 'text/html',
    artifactManifest: {
      version: 1,
      kind: 'html',
      title: 'Gallery',
      entry: 'gallery.html',
      renderer: 'html',
      exports: ['html'],
    },
  } as ProjectFile;
}

function renderUrlLoadPreview() {
  render(
    <FileViewer
      projectId="first-load-reveal"
      projectKind="prototype"
      file={htmlArtifact()}
      liveHtml={'<html><body><main>Gallery</main><video src="https://cdn.example/slow.mp4" autoplay muted></video></body></html>'}
    />,
  );
  const frame = screen.getByTestId('artifact-preview-frame') as HTMLIFrameElement;
  expect(frame.getAttribute('data-od-render-mode')).toBe('url-load');
  return frame;
}

function postFromFrame(source: MessageEventSource | null, type: string) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { source, data: { type } }));
  });
}

describe('URL-load first-load cover', () => {
  it('lifts after DOM ready + grace even though the iframe never fires load', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const frame = renderUrlLoadPreview();
    expect(screen.getByTestId('artifact-preview-first-load')).toBeTruthy();

    // The scroll bridge posts this from the artifact's DOMContentLoaded.
    postFromFrame(frame.contentWindow, 'od:preview-scroll-request');
    act(() => {
      vi.advanceTimersByTime(URL_PREVIEW_FIRST_LOAD_GRACE_MS - 1);
    });
    expect(screen.getByTestId('artifact-preview-first-load')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    // No `load` event was ever dispatched: the subresources are still pending.
    expect(screen.queryByTestId('artifact-preview-first-load')).toBeNull();
  });

  it('ignores DOM-ready messages from other windows', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderUrlLoadPreview();
    expect(screen.getByTestId('artifact-preview-first-load')).toBeTruthy();

    postFromFrame(window, 'od:preview-scroll-request');
    act(() => {
      vi.advanceTimersByTime(URL_PREVIEW_FIRST_LOAD_GRACE_MS * 2);
    });
    expect(screen.getByTestId('artifact-preview-first-load')).toBeTruthy();
  });
});
