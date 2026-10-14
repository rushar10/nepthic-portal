"use client";
import { useEffect } from "react";

/** Keeps the scanner page available offline (production only). */
export function ScanSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/scan-sw.js", { scope: "/scan" }).catch(() => {});
  }, []);
  return null;
}
