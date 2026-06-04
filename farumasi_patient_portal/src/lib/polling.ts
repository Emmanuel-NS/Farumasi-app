/** Poll only while the browser tab is visible — reduces CPU/network when backgrounded. */
export function startVisibleInterval(fn: () => void, intervalMs: number): () => void {
  if (typeof document === "undefined") return () => {};
  let id: ReturnType<typeof setInterval> | null = null;

  const start = () => {
    if (id != null) return;
    id = setInterval(fn, intervalMs);
  };
  const stop = () => {
    if (id == null) return;
    clearInterval(id);
    id = null;
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      fn();
      start();
    } else {
      stop();
    }
  };

  if (document.visibilityState === "visible") {
    fn();
    start();
  }
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    stop();
  };
}
