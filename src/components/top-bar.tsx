"use client";

import { useState } from "react";
import { CalendarIcon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavDrawer } from "@/components/nav-drawer";

interface TopBarProps {
  displayName: string;
}

export function TopBar({ displayName }: TopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-topbar px-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-2xl"
          onClick={() => setDrawerOpen(true)}
          aria-label="Otevřít menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Scheduler
          </span>
        </div>

      </header>

      <NavDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        displayName={displayName}
      />
    </>
  );
}
