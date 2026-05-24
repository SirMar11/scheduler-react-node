"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Service Worker funguje jen v production buildu — v dev módu se neregistruje,
    // aby cache nezpůsobovala matoucí chování během vývoje.
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(console.error);
    }
  }, []);

  return null;
}
