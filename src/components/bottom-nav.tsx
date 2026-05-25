"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Kalendář", icon: CalendarIcon },
  { href: "/notes", label: "Poznámky", icon: FileText },
  { href: "/settings", label: "Nastavení", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 border-t bg-background">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        // Stránky kalendáře (/ i /day/*) zvýrazní záložku Kalendář
        const isActive =
          href === "/"
            ? pathname === "/" || pathname.startsWith("/day/")
            : pathname === href || pathname.startsWith(href + "/");

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon
              className={cn("h-5 w-5", isActive && "[stroke-width:2.5px]")}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
