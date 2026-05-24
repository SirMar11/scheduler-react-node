"use client";

// Staticky generovaná → Workbox ji precachuje při buildu a servíruje offline.
export const dynamic = "force-static";

import { CalendarIcon, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="relative">
        <CalendarIcon className="h-16 w-16 text-muted-foreground/40" />
        <WifiOff className="absolute -right-2 -bottom-2 h-7 w-7 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Jsi offline</h1>
        <p className="text-sm text-muted-foreground">
          Zkontroluj připojení k internetu a zkus to znovu.
        </p>
      </div>

      {/* Reload musí být client-side — použijeme čisté JS bez "use client" */}
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Zkusit znovu
      </button>
    </div>
  );
}
