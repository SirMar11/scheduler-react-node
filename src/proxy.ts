import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Musíme vytvořit nový response objekt, který middleware vrátí.
  // Supabase do něj zapíše refreshnuté auth cookies — bez toho by session expirovala.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Zapíšeme cookies do requestu i response — oba musí být synchronizované.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() ověří JWT token na Supabase serveru — nikdy nepoužívej getSession(),
  // která čte jen lokální cookies bez serverové validace (bezpečnostní riziko).
  // error ignorujeme záměrně — refresh_token_not_found je běžný stav po vypršení
  // session, user bude null a middleware správně přesměruje na /login.
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // Nepřihlášený uživatel mimo auth stránky → přesměruj na login
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Přihlášený uživatel na auth stránkách → přesměruj do aplikace
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // Proxy běží na všech cestách kromě statických souborů a Next.js internals.
  // /offline je přístupná i offline (bez auth) — je v matcher, ale bez přihlášení
  // ji uvidíš jen pokud ji SW servíruje ze své cache.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
