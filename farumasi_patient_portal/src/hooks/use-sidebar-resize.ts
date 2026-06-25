"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const SIDEBAR_MIN_WIDTH = 92;
export const SIDEBAR_DEFAULT_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 320;
const GRIP_WIDTH = 14;
const MIN_MAIN_WIDTH = 380;
const RIGHT_PANEL_WIDTH = 360;
const PANEL_GAP = 12;
const LABEL_COLLAPSE_WIDTH = 148;
const STORAGE_KEY = "farumasi-sidebar-width";

export function getSidebarBounds(viewportWidth: number, rightPanelOpen: boolean) {
  const reserved =
    GRIP_WIDTH +
    MIN_MAIN_WIDTH +
    (rightPanelOpen ? RIGHT_PANEL_WIDTH + PANEL_GAP : 0);
  const maxByViewport = Math.max(SIDEBAR_MIN_WIDTH, viewportWidth - reserved);
  return {
    min: SIDEBAR_MIN_WIDTH,
    max: Math.min(SIDEBAR_MAX_WIDTH, maxByViewport),
  };
}

function readStoredWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) return n;
  } catch {
    /* ignore */
  }
  return SIDEBAR_DEFAULT_WIDTH;
}

export function useSidebarResize(rightPanelOpen: boolean) {
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const lastExpandedRef = useRef(SIDEBAR_DEFAULT_WIDTH);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const clampWidth = useCallback(
    (next: number) => {
      const { min, max } = getSidebarBounds(window.innerWidth, rightPanelOpen);
      return Math.min(max, Math.max(min, next));
    },
    [rightPanelOpen],
  );

  useEffect(() => {
    setWidth((w) => clampWidth(readStoredWidth() || w));
  }, [clampWidth]);

  useEffect(() => {
    setWidth((w) => clampWidth(w));
  }, [rightPanelOpen, clampWidth]);

  useEffect(() => {
    const onResize = () => setWidth((w) => clampWidth(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampWidth]);

  useEffect(() => {
    if (isDragging) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
    } catch {
      /* ignore */
    }
  }, [width, isDragging]);

  const collapsed = width < LABEL_COLLAPSE_WIDTH;

  const toggle = useCallback(() => {
    setWidth((w) => {
      if (w > SIDEBAR_MIN_WIDTH + 8) {
        if (w > SIDEBAR_MIN_WIDTH + 8) lastExpandedRef.current = w;
        return SIDEBAR_MIN_WIDTH;
      }
      return clampWidth(lastExpandedRef.current || SIDEBAR_DEFAULT_WIDTH);
    });
  }, [clampWidth]);

  const onResizeStart = useCallback(
    (clientX: number) => {
      dragRef.current = { startX: clientX, startWidth: width };
      setIsDragging(true);
    },
    [width],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      const next = clampWidth(dragRef.current.startWidth + delta);
      if (next > SIDEBAR_MIN_WIDTH + 8) lastExpandedRef.current = next;
      setWidth(next);
    };

    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, clampWidth]);

  return { width, collapsed, toggle, isDragging, onResizeStart };
}
