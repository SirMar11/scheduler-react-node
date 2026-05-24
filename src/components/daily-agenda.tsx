"use client";

import { useState } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventForm, type EditEventData } from "@/components/event-form";

type EventRow = {
  id: string;
  calendarId: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string | null;
  recurrenceRule?: string | null;
  parentEventId?: string | null;
};

type NoteRow = {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  targetDate: string | null;
  eventId: string | null;
};

interface DailyAgendaProps {
  day: Date;
  events: EventRow[];
  calendarColorMap: Map<string, string>;
}

export function DailyAgenda({ day, events, calendarColorMap }: DailyAgendaProps) {
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EditEventData | null>(null);

  const queryClient = useQueryClient();
  const dateKey = format(day, "yyyy-MM-dd");

  const { data: dayNotes = [] } = useQuery<NoteRow[]>({
    queryKey: ["notes", dateKey],
    queryFn: async () => {
      const res = await apiClient.api.notes.$get({
        query: { from: dateKey, to: dateKey },
      });
      if (!res.ok) throw new Error("Nepodařilo se načíst poznámky");
      return res.json() as Promise<NoteRow[]>;
    },
  });

  const createNote = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiClient.api.notes.$post({
        json: { title, targetDate: dateKey },
      });
      if (!res.ok) throw new Error("Nepodařilo se vytvořit poznámku");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setNewNoteTitle("");
      setAddingNote(false);
      toast.success("Poznámka přidána");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.api.notes[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Nepodařilo se smazat poznámku");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Poznámka smazána");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.api.events[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Nepodařilo se smazat událost");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Událost smazána");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function isAllDay(event: EventRow) {
    return format(new Date(String(event.startTime)), "HH:mm") === "00:00";
  }

  function handleEditEvent(event: EventRow) {
    setEditingEvent({
      id: event.id,
      calendarId: event.calendarId,
      title: event.title,
      description: event.description,
      startTime: String(event.startTime),
      endTime: String(event.endTime),
      recurrenceRule: event.recurrenceRule,
    });
    setFormOpen(true);
  }

  const isEmpty = events.length === 0 && dayNotes.length === 0;

  return (
    <>
      <div className="flex h-52 shrink-0 flex-col border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center border-b px-5 py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">
              {format(day, "d. MMMM", { locale: cs })}
            </span>
            <span className="text-xs capitalize text-muted-foreground">
              {format(day, "EEEE", { locale: cs })}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditingEvent(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Událost
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setAddingNote(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Poznámka
            </Button>
          </div>
        </div>

        {/* ── Unified list ────────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0.5 px-3 py-2">
            {isEmpty && !addingNote && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Žádné události ani poznámky
              </p>
            )}

            {/* Events — colored dot + time */}
            {events.map((event) => {
              const color = calendarColorMap.get(event.calendarId) ?? "#64748b";
              const allDay = isAllDay(event);
              return (
                <div
                  key={`${event.id}-${String(event.startTime)}`}
                  className="group -mx-1 flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/50"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex-1 truncate text-sm">{event.title}</span>
                  {!allDay && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(String(event.startTime)), "H:mm")}
                      {" – "}
                      {format(new Date(String(event.endTime)), "H:mm")}
                    </span>
                  )}
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEditEvent(event)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteEvent.mutate(event.id)}
                      disabled={deleteEvent.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Notes — violet file icon */}
            {dayNotes.map((note) => (
              <div
                key={note.id}
                className="group -mx-1 flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/50"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                <span className="flex-1 truncate text-sm text-muted-foreground">
                  {note.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => deleteNote.mutate(note.id)}
                  disabled={deleteNote.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Inline add-note form */}
            {addingNote && (
              <form
                className="mt-1 flex gap-1.5 px-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newNoteTitle.trim()) createNote.mutate(newNoteTitle.trim());
                }}
              >
                <Input
                  autoFocus
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Nová poznámka..."
                  className="h-7 flex-1 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setAddingNote(false);
                      setNewNoteTitle("");
                    }
                  }}
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!newNoteTitle.trim() || createNote.isPending}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </form>
            )}
          </div>
        </ScrollArea>
      </div>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialDate={day}
        editEvent={editingEvent}
      />
    </>
  );
}
