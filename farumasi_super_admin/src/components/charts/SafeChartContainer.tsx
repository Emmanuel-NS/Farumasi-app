"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * Recharts ResponsiveContainer can enter a resize-observer loop inside flex layouts,
 * pegging CPU/GPU. Fixed outer height + debounced measure avoids that.
 */
export function SafeChartContainer({
  height,
  children,
}: {
  height: number;
  children: React.ReactElement;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      style={{ width: "100%", height, minHeight: height, minWidth: 0 }}
      className="overflow-hidden"
    >
      {ready ? (
        <ResponsiveContainer width="100%" height="100%" debounce={150}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
