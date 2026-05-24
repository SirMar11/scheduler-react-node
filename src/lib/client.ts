import { hc } from "hono/client";
import type { AppType } from "@/app/api/[[...route]]/route";

// V prohlížeči relativní URL stačí (prázdný string = stejná origin).
// Na serveru (SSR, Server Components) potřebujeme absolutní URL.
function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// hc<AppType> přečte exportovaný typ z route.ts a vygeneruje plně otypovaného klienta.
// Žádný runtime overhead — typy existují jen při kompilaci.
export const apiClient = hc<AppType>(getBaseUrl());
