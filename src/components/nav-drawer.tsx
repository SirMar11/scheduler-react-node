"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarIcon, FileText, LogOut, Moon, Settings, Sun, User, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
}

const PRIMARY_NAV = [
  { href: "/", label: "Kalendář", icon: CalendarIcon },
  { href: "/notes", label: "Poznámky", icon: FileText },
];

const SECONDARY_NAV = [
  { href: "/settings", label: "Nastavení", icon: Settings },
  { href: "/account", label: "Správa účtu", icon: User },
  { href: "/connected", label: "Propojené účty", icon: Users },
];

export function NavDrawer({ open, onOpenChange, displayName }: NavDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();

  async function handleLogout() {
    queryClient.clear();
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0" aria-describedby={undefined}>
        <VisuallyHidden>
          <SheetTitle>Navigace</SheetTitle>
        </VisuallyHidden>

        <div className="flex h-full flex-col">
          {/* Profil */}
          <div className="flex items-center gap-4 px-6 py-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-lg font-semibold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="font-display truncate text-lg font-semibold">
              {displayName}
            </span>
          </div>

          <Separator />

          {/* Primární navigace */}
          <div className="flex flex-col gap-1 p-4">
            {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/"
                  ? pathname === "/" || pathname.startsWith("/day/")
                  : pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "nav-link",
                    isActive
                      ? "bg-accent font-semibold"
                      : "text-foreground/80"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </div>

          <Separator />

          {/* Sekundární navigace */}
          <div className="flex flex-col gap-1 p-4">
            {SECONDARY_NAV.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "nav-link text-sm",
                    isActive
                      ? "bg-accent font-semibold"
                      : "text-foreground/70"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Spodní akce */}
          <div className="mt-auto">
            <Separator />
            <div className="flex flex-col gap-1 p-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-3 rounded-2xl py-3 text-base text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                {resolvedTheme === "dark" ? "Světlý motiv" : "Tmavý motiv"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-3 rounded-2xl py-3 text-base text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Odhlásit se
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
