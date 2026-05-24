import { createBrowserClient } from "@supabase/ssr";

// Singleton pattern — prohlížeč potřebuje jen jednu instanci klienta.
// createBrowserClient interně cachuje instanci, takže volání createClient()
// vícekrát ze stejného klientského kódu je bezpečné.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
