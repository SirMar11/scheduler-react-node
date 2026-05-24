import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppShell userEmail={user?.email ?? ""} />;
}
