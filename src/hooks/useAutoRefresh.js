import { useEffect, useRef } from 'react';

/** How often pages poll for new data while the tab is visible */
export const LIVE_REFRESH_MS = 10000;

export const LIVE_REFRESH_EVENT = 'propsync:refresh';

/** Trigger an immediate silent refresh on all mounted pages */
export function dispatchLiveRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LIVE_REFRESH_EVENT));
  }
}

/**
 * Re-run callback on an interval + when tab becomes visible + on global refresh event.
 * @param {(silent?: boolean) => void | Promise<void>} callback — pass silent=true on polls
 * @param {unknown[]} deps
 * @param {number} [intervalMs]
 */
export function useAutoRefresh(callback, deps = [], intervalMs = LIVE_REFRESH_MS) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const run = (silent = false) => {
      if (document.visibilityState !== 'visible') return;
      cbRef.current?.(silent);
    };

    run(false);

    const timer = setInterval(() => run(true), intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run(true);
    };
    const onGlobal = () => run(true);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(LIVE_REFRESH_EVENT, onGlobal);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(LIVE_REFRESH_EVENT, onGlobal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
