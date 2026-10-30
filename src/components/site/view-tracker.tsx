"use client";
import * as React from "react";

/** Counts one view per product per browser session (feeds "most viewed" in the dashboard). */
export function ViewTracker({ id }: { id: string }) {
  React.useEffect(() => {
    const key = `lc_viewed_${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    fetch(`/api/products/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);
  return null;
}
