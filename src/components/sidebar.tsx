"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, LogOutIcon, Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteEditDialog, type NoteRow } from "@/components/note-edit-dialog";

export function Sidebar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteRow | null>(null);

  // Plovoucí poznámky — bez targetDate
  const { data: floatingNotes = [], isLoading } = useQuery<NoteRow[]>({
    queryKey: ["notes", "floating"],
    queryFn: async () => {
      const res = await apiClient.api.notes.$get({ query: {} });
      if (!res.ok) throw new Error("Nepodařilo se načíst poznámky");
      return res.json() as Promise<NoteRow[]>;
    },
  });

  async function handleLogout() {
    queryClient.clear();
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function openAddNote() {
    setEditingNote(null);
    setNoteDialogOpen(true);
  }

  function openEditNote(note: NoteRow) {
    setEditingNote(note);
    setNoteDialogOpen(true);
  }

  return (
    <>
      <aside className="flex h-full w-60 flex-col border-r bg-background">
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Scheduler</span>
        </div>

        <Separator />

        {/* Plovoucí poznámky */}
        <div className="flex flex-1 flex-col overflow-hidden px-3 py-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Poznámky
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={openAddNote}
              aria-label="Přidat poznámku"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col gap-1.5 px-2 pt-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <Skeleton className="mt-0.5 h-3.5 w-3.5 rounded" />
                    <div className="flex flex-1 flex-col gap-1">
                      <Skeleton className="h-3.5 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : floatingNotes.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Žádné poznámky
              </p>
            ) : (
              floatingNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => openEditNote(note)}
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{note.title}</p>
                    {note.content && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {note.content}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <Separator />

        {/* Odhlášení */}
        <div className="shrink-0 p-3">
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

      <NoteEditDialog
        note={editingNote}
        targetDate={null}
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
      />
    </>
  );
}
