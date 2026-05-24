"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarIcon, PlusIcon, LogOutIcon } from "lucide-react";

// Předvolené barvy pro výběr při tvorbě kalendáře
const PRESET_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState(PRESET_COLORS[0]);

  const router = useRouter();
  const supabase = createClient();
  // useQueryClient() vrátí stejnou instanci QueryClient z Providers —
  // použijeme ho pro invalidaci cache po mutaci
  const queryClient = useQueryClient();

  // ── Fetch kalendářů ───────────────────────────────────────────────────────
  // useQuery fetchne data při mountu a cachuje je pod klíčem ["calendars"].
  // Pokud jiná komponenta použije stejný klíč, dostane data z cache (bez nového fetche).
  const { data: userCalendars = [], isLoading } = useQuery({
    queryKey: ["calendars"],
    queryFn: async () => {
      const res = await apiClient.api.calendars.$get();
      if (!res.ok) throw new Error("Nepodařilo se načíst kalendáře");
      return res.json();
    },
  });

  // ── Vytvoření kalendáře ────────────────────────────────────────────────────
  // useMutation pro operace, které mění data (POST/PATCH/DELETE).
  // onSuccess invaliduje cache ["calendars"] → useQuery výše se automaticky
  // znovu spustí a stáhne čerstvá data. To je reaktivní UI bez ručního setState.
  const createCalendar = useMutation({
    mutationFn: async (data: { name: string; colorHex: string }) => {
      const res = await apiClient.api.calendars.$post({ json: data });
      if (!res.ok) throw new Error("Nepodařilo se vytvořit kalendář");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendars"] });
      toast.success("Kalendář vytvořen");
      setIsOpen(false);
      setName("");
      setColorHex(PRESET_COLORS[0]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Odhlášení ─────────────────────────────────────────────────────────────
  async function handleLogout() {
    // Synchronní clear před signOut — příští uživatel neuvidí tato data
    queryClient.clear();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleCreateCalendar(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createCalendar.mutate({ name: name.trim(), colorHex });
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4 font-semibold">
        <CalendarIcon className="h-5 w-5" />
        <span>Scheduler</span>
      </div>

      <Separator />

      {/* Seznam kalendářů */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <div className="mb-1 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Kalendáře
        </div>

        {isLoading && (
          <div className="flex flex-col gap-1 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3.5 flex-1 rounded" />
              </div>
            ))}
          </div>
        )}

        {userCalendars.map((calendar) => (
          <div
            key={calendar.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
          >
            {/* Barevný indikátor kalendáře */}
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: calendar.colorHex }}
            />
            <span className="truncate">{calendar.name}</span>
          </div>
        ))}

        {/* Tlačítko pro nový kalendář */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full justify-start gap-2 text-muted-foreground"
            >
              <PlusIcon className="h-4 w-4" />
              Nový kalendář
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vytvořit kalendář</DialogTitle>
              <DialogDescription className="sr-only">
                Formulář pro vytvoření nového kalendáře
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCalendar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cal-name">Název</Label>
                <Input
                  id="cal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Můj kalendář"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Barva</Label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorHex(color)}
                      className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        outline:
                          colorHex === color ? `2px solid ${color}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {createCalendar.isError && (
                <p className="text-sm text-destructive">
                  {createCalendar.error.message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={createCalendar.isPending}
              >
                {createCalendar.isPending ? "Ukládám..." : "Vytvořit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Odhlášení */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground"
        >
          <LogOutIcon className="h-4 w-4" />
          Odhlásit se
        </Button>
      </div>
    </aside>
  );
}
