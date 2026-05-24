// Route group (auth) — závorky znamenají, že "auth" není součástí URL.
// /login a /register jsou stále přístupné bez prefixu.
// Tento layout centruje obsah na stránce — sdílí ho login i register.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
