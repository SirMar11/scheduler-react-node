"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type NoteRow = {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  targetDate: string | null;
  eventId: string | null;
};

interface NoteEditDialogProps {
  /** null = create mode */
  note: NoteRow | null;
  /** Required in create mode when creating a dated note; omit for floating note */
  targetDate?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteEditDialog({
  note,
  targetDate,
  open,
  onOpenChange,
}: NoteEditDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const isEditMode = note !== null;

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? "");
      setContent(note?.content ?? "");
    }
  }, [open, note]);

  const saveNote = useMutation({
    mutationFn: async () => {
      const body = {
        title: title.trim(),
        ...(content.trim() && { content: content.trim() }),
      };

      if (isEditMode) {
        const res = await apiClient.api.notes[":id"].$patch({
          param: { id: note.id },
          json: body,
        });
        if (!res.ok) throw new Error("Nepodařilo se uložit poznámku");
        return res.json();
      } else {
        const res = await apiClient.api.notes.$post({
          json: { ...body, ...(targetDate ? { targetDate } : {}) },
        });
        if (!res.ok) throw new Error("Nepodařilo se vytvořit poznámku");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success(isEditMode ? "Poznámka uložena" : "Poznámka přidána");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNote = useMutation({
    mutationFn: async () => {
      const res = await apiClient.api.notes[":id"].$delete({
        param: { id: note!.id },
      });
      if (!res.ok) throw new Error("Nepodařilo se smazat poznámku");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Poznámka smazána");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle className="font-display text-base font-medium text-muted-foreground">
            {isEditMode ? "Upravit poznámku" : "Nová poznámka"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode
              ? "Formulář pro úpravu poznámky"
              : "Formulář pro vytvoření nové poznámky"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) saveNote.mutate();
          }}
          className="flex flex-col gap-4 px-6 pb-4"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Název poznámky"
            className="rounded-none border-0 border-b px-0 font-display text-xl font-semibold shadow-none placeholder:text-muted-foreground/50 focus-visible:border-b-primary focus-visible:ring-0"
            autoFocus
            required
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Text poznámky..."
            className="min-h-36 resize-none rounded-2xl text-base"
          />

          <div className="flex items-center justify-between">
            {isEditMode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-2xl text-destructive hover:text-destructive"
                onClick={() => deleteNote.mutate()}
                disabled={deleteNote.isPending}
              >
                Smazat
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-2xl"
                onClick={() => onOpenChange(false)}
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-2xl"
                disabled={!title.trim() || saveNote.isPending}
              >
                {saveNote.isPending
                  ? "Ukládám..."
                  : isEditMode
                    ? "Uložit"
                    : "Přidat"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
