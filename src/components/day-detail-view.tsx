"use client";

import { useMemo, useState } from "react";
import { endOfDay, format, parseISO, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
};

interface DayDetailViewProps {
  /** Formát YYYY-MM-DD */
  date: string;
}

export function DayDetailView({ date }: DayDetailViewProps) {
  const router = useRouter();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EditEventData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventDetailData | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteRow | null>(null);

  const day = parseISO(date);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const { data: userCalendars = [] } = useQuery({
    queryKey: ["calendars"],
    queryFn: async () => {
      const res = await apiClient.api.calendars.$get();
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const calendarColorMap = useMemo(
    () => new Map(userCalendars.map((c) => [c.id, c.colorHex])),
    [userCalendars]
  );

  const { data: allEvents = [] } = useQuery({
    queryKey: ["events", date],
    queryFn: async () => {
      const res = await apiClient.api.events.$get({
        query: { from: dayStart.toISOString(), to: dayEnd.toISOString() },
      });
      if (!res.ok) throw new Error("Nepodařilo se načíst události");
      return res.json();
    },
  });

  const dayEvents = allEvents.filter((e) => {
    const start = new Date(String(e.startTime));
    const end = new Date(String(e.endTime));
    return start <= dayEnd && end >= dayStart;
  });

  const { data: dayNotes = [] } = useQuery<NoteRow[]>({
    queryKey: ["notes", date],
    queryFn: async () => {
      const res = await apiClient.api.notes.$get({ query: { from: date, to: date } });
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

  return (
    <>
      <div className="flex h-full flex-col bg-background">
        {/* Hlavička */}
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-2xl"
            onClick={() => router.back()}
            aria-label="Zpět"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-semibold">
              {format(day, "d. MMMM yyyy", { locale: cs })}
            </h1>
            <p className="text-sm capitalize text-muted-foreground">
              {format(day, "EEEE", { locale: cs })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-2xl text-sm"
              onClick={() => { setEditingEvent(null); setFormOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Událost
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-2xl text-sm"
              onClick={() => { setEditingNote(null); setNoteDialogOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Poznámka
            </Button>
          </div>
        </div>

        {/* Obsah */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {dayEvents.length === 0 && dayNotes.length === 0 && (
              <p className="py-16 text-center text-base text-muted-foreground">
                Žádné události ani poznámky pro tento den
              </p>
            )}

            {/* Události */}
            {dayEvents.length > 0 && (
              <section className="mb-6">
                <h2 className="section-label mb-4">Události</h2>
                <div className="flex flex-col gap-2">
                  {dayEvents.map((event) => {
                    const color = calendarColorMap.get(event.calendarId) ?? "#8B6448";
                    return (
                      <button
                        key={`${event.id}-${String(event.startTime)}`}
                        onClick={() => openEventDetail(event)}
                        className="app-card-hover flex w-full items-start gap-4 px-5 py-4 text-left"
                      >
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium">{event.title}</p>
                          {!isAllDay(event) && (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {format(new Date(String(event.startTime)), "H:mm")}
                              {" – "}
                              {format(new Date(String(event.endTime)), "H:mm")}
                            </p>
                          )}
                          {event.description && (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {dayEvents.length > 0 && dayNotes.length > 0 && (
              <Separator className="my-6" />
            )}

            {/* Poznámky */}
            {dayNotes.length > 0 && (
              <section>
                <h2 className="section-label mb-4">Poznámky</h2>
                <div className="flex flex-col gap-2">
                  {dayNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => { setEditingNote(note); setNoteDialogOpen(true); }}
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
              </section>
            )}
          </div>
        </ScrollArea>
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
        targetDate={date}
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
      />
    </>
  );
}
