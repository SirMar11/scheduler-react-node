import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/top-bar";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "Uživatel");

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <TopBar displayName={displayName} />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
