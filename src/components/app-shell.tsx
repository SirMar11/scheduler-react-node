"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";
import { CalendarView } from "@/components/calendar-view";

interface AppShellProps {
  userEmail: string;
}

export function AppShell({ userEmail }: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Desktop sidebar — skrytý na mobilech ───────────────────────── */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* ── Hlavní oblast ───────────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
          {/* Hamburger — viditelný jen na mobilech */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Otevřít menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
        </header>

        <div className="flex-1 overflow-hidden">
          <CalendarView />
        </div>
      </main>

      {/* ── Mobilní sidebar jako Sheet ──────────────────────────────────── */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0"
          aria-describedby={undefined}
        >
          <Sidebar />
        </SheetContent>
      </Sheet>
    </div>
  );
}
