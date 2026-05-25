"use client";

import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteEditDialog, type NoteRow } from "@/components/note-edit-dialog";

export function NotesView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteRow | null>(null);

  const { data: notes = [], isLoading } = useQuery<NoteRow[]>({
    queryKey: ["notes", "floating"],
    queryFn: async () => {
      const res = await apiClient.api.notes.$get({});
      if (!res.ok) throw new Error("Nepodařilo se načíst poznámky");
      return res.json() as Promise<NoteRow[]>;
    },
  });

  return (
    <>
      <div className="flex h-full flex-col bg-background">
        <div className="flex shrink-0 items-center border-b px-5 py-4">
          <h1 className="font-display text-2xl font-semibold">Poznámky</h1>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-9 gap-1.5 rounded-2xl text-sm"
            onClick={() => { setEditingNote(null); setDialogOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Nová poznámka
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {isLoading && (
              <p className="py-16 text-center text-base text-muted-foreground">
                Načítání…
              </p>
            )}

            {!isLoading && notes.length === 0 && (
              <p className="py-16 text-center text-base text-muted-foreground">
                Zatím žádné poznámky
              </p>
            )}

            <div className="flex flex-col gap-3">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => { setEditingNote(note); setDialogOpen(true); }}
                  className="app-card-hover flex w-full items-start gap-4 px-5 py-4 text-left"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-note" />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium">{note.title}</p>
                    {note.content && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {note.content}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      <NoteEditDialog
        note={editingNote}
        targetDate={null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
