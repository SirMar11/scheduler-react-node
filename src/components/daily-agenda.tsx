"use client";

import Link from "next/link";
import { useState } from "react";
import { endOfDay, format, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventForm, type EditEventData } from "@/components/event-form";
import { EventDetailDialog, type EventDetailData } from "@/components/event-detail-dialog";
import { NoteEditDialog, type NoteRow } from "@/components/note-edit-dialog";

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

interface DailyAgendaProps {
  day: Date;
  calendarColorMap: Map<string, string>;
  /** Week mode: taller panel, higher item limit */
  expanded?: boolean;
}

export function DailyAgenda({ day, calendarColorMap, expanded = false }: DailyAgendaProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EditEventData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventDetailData | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteRow | null>(null);
  const dateKey = format(day, "yyyy-MM-dd");

  // Fetch events for this specific day — self-contained so week navigation works correctly
  const { data: events = [] } = useQuery<EventRow[]>({
    queryKey: ["events", dateKey],
    queryFn: async () => {
      const res = await apiClient.api.events.$get({
        query: {
          from: startOfDay(day).toISOString(),
          to: endOfDay(day).toISOString(),
        },
      });
      if (!res.ok) throw new Error("Nepodařilo se načíst události");
      return res.json() as Promise<EventRow[]>;
    },
  });

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

  function isAllDay(event: EventRow) {
    return format(new Date(String(event.startTime)), "HH:mm") === "00:00";
  }

  function openEventDetail(event: EventRow) {
    setDetailEvent({
      id: event.id,
      calendarId: event.calendarId,
      title: event.title,
      description: event.description,
      startTime: String(event.startTime),
      endTime: String(event.endTime),
      recurrenceRule: event.recurrenceRule,
    });
    setDetailOpen(true);
  }

  function handleEditFromDetail() {
    if (!detailEvent) return;
    setEditingEvent({
      id: detailEvent.id,
      calendarId: detailEvent.calendarId,
      title: detailEvent.title,
      description: detailEvent.description,
      startTime: detailEvent.startTime,
      endTime: detailEvent.endTime,
      recurrenceRule: detailEvent.recurrenceRule,
    });
    setFormOpen(true);
  }

  const LIMIT = expanded ? 8 : 3;
  const shownEvents = events.slice(0, LIMIT);
  const shownNotes = dayNotes.slice(0, Math.max(0, LIMIT - shownEvents.length));
  const hiddenCount =
    events.length + dayNotes.length - shownEvents.length - shownNotes.length;
  const isEmpty = events.length === 0 && dayNotes.length === 0;

  return (
    <>
      {/* Panel — zaoblené horní rohy, funguje jako floating sheet */}
      <div className={cn(
        "flex shrink-0 flex-col rounded-t-3xl border-t bg-background shadow-[0_-4px_24px_oklch(0_0_0/0.06)]",
        expanded ? "min-h-0 flex-1 sm:flex-none sm:h-80" : "h-64 shrink-0"
      )}>

        {/* Hlavička */}
        <div className="flex shrink-0 items-center gap-3 px-5 py-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-display text-base font-semibold">
              {format(day, "d. MMMM", { locale: cs })}
            </span>
            <span className="truncate text-sm capitalize text-muted-foreground">
              {format(day, "EEEE", { locale: cs })}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-2xl text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { setEditingEvent(null); setFormOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Událost
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-2xl text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { setEditingNote(null); setNoteDialogOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Poznámka
            </Button>
          </div>
        </div>

        {/* Obsah + radial blur overlay */}
        <div className="group relative min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-0.5 px-4 pb-10 pt-1">
              {isEmpty && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Žádné události ani poznámky
                </p>
              )}

              {shownEvents.map((event) => {
                const color = calendarColorMap.get(event.calendarId) ?? "#8B6448";
                return (
                  <button
                    key={`${event.id}-${String(event.startTime)}`}
                    onClick={() => openEventDetail(event)}
                    className="-mx-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="flex-1 truncate text-base">{event.title}</span>
                    {!isAllDay(event) && (
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {format(new Date(String(event.startTime)), "H:mm")}
                        {" – "}
                        {format(new Date(String(event.endTime)), "H:mm")}
                      </span>
                    )}
                  </button>
                );
              })}

              {shownNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => { setEditingNote(note); setNoteDialogOpen(true); }}
                  className="-mx-1 flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-note" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base">{note.title}</p>
                    {note.content && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {note.content}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              {hiddenCount > 0 && (
                <p className="px-3 py-1 text-sm text-muted-foreground">
                  +{hiddenCount} dalších…
                </p>
              )}
            </div>
          </ScrollArea>

          {/*
           * Radial blur — disperzně se zobrazí kolem tlačítka dole uprostřed.
           * pointer-events-none = nekryje interakci s položkami výše.
           */}
          <div className="agenda-radial-blur absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Tlačítko "Detail dne" — uprostřed dole, jen při hoveru */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <Link
              href={`/day/${dateKey}`}
              className="pointer-events-auto flex items-center gap-2 rounded-full border bg-background/95 px-5 py-2 text-sm font-medium shadow-lg transition-shadow hover:shadow-xl"
            >
              Detail dne
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <EventDetailDialog
        event={detailEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        calendarColorMap={calendarColorMap}
        onEdit={handleEditFromDetail}
      />
      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialDate={day}
        editEvent={editingEvent}
      />
      <NoteEditDialog
        note={editingNote}
        targetDate={dateKey}
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
      />
    </>
  );
}
