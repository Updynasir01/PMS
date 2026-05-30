import { useEffect, useRef, useCallback } from 'react';

const POLL_MS = 2500;
const BOTTOM_THRESHOLD = 80;

/** Poll maintenance thread so new messages appear without refresh */
export function useMaintenanceChatPoll({ enabled, fetchDetail, onUpdate, intervalMs = POLL_MS }) {
  const lastMsgIdRef = useRef(null);
  const msgCountRef = useRef(0);
  const chatRef = useRef(null);
  const atBottomRef = useRef(true);

  const scrollToBottom = useCallback((force = false) => {
    const el = chatRef.current;
    if (!el) return;
    if (force || atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const detail = await fetchDetail();
      const msgs = detail?.messages || [];
      const lastId = msgs[msgs.length - 1]?.id ?? null;
      const changed = msgs.length !== msgCountRef.current || lastId !== lastMsgIdRef.current;
      if (changed) {
        msgCountRef.current = msgs.length;
        lastMsgIdRef.current = lastId;
        onUpdate(detail);
        requestAnimationFrame(() => scrollToBottom());
      }
    } catch {
      /* ignore transient poll errors */
    }
  }, [enabled, fetchDetail, onUpdate, scrollToBottom]);

  useEffect(() => {
    if (!enabled) return undefined;
    poll();
    const timer = setInterval(poll, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, poll, intervalMs]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [enabled]);

  return { chatRef, scrollToBottom, pollNow: poll };
}
