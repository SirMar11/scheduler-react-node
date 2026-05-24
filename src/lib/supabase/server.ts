import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Tento klient se používá v Server Components, Server Actions a Route Handlers.
// `cookies()` z next/headers je read-only v Server Components, ale read-write
// v Server Actions — @supabase/ssr to řeší automaticky přes try/catch v setAll.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components nemohou nastavovat cookies — ignorujeme.
            // Middleware se postará o refresh tokenu.
          }
        },
      },
    }
  );
}
