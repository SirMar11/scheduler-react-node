"use client";

import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";
import { AlignLeft, Clock, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type EventDetailData = {
  id: string;
  calendarId: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string | null;
  recurrenceRule?: string | null;
};

interface EventDetailDialogProps {
  event: EventDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarColorMap: Map<string, string>;
  /** Called when user clicks "Upravit" — parent should then open EventForm */
  onEdit: () => void;
}

function formatEventTime(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const allDay = format(start, "HH:mm") === "00:00";

  if (allDay) {
    const startStr = format(start, "d. MMMM yyyy", { locale: cs });
    // end is stored as 23:59 of the last day for all-day events
    const endDay = format(end, "HH:mm") === "23:59" ? end : end;
    const endStr = format(endDay, "d. MMMM yyyy", { locale: cs });
    return startStr === endStr ? startStr : `${format(start, "d. MMMM", { locale: cs })} – ${endStr}`;
  }

  if (isSameDay(start, end)) {
    return `${format(start, "d. MMMM yyyy", { locale: cs })}, ${format(start, "H:mm")} – ${format(end, "H:mm")}`;
  }
  return `${format(start, "d. M. H:mm", { locale: cs })} – ${format(end, "d. M. yyyy H:mm", { locale: cs })}`;
}

function formatRecurrenceRule(rule: string): string {
  if (rule.includes("FREQ=DAILY")) return "Opakuje se každý den";
  if (rule.includes("FREQ=WEEKLY")) return "Opakuje se každý týden";
  if (rule.includes("FREQ=MONTHLY")) return "Opakuje se každý měsíc";
  if (rule.includes("FREQ=YEARLY")) return "Opakuje se každý rok";
  return "Opakující se událost";
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  calendarColorMap,
  onEdit,
}: EventDetailDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  const { data: userCalendars = [] } = useQuery({
    queryKey: ["calendars"],
    queryFn: async () => {
      const res = await apiClient.api.calendars.$get();
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async () => {
      const res = await apiClient.api.events[":id"].$delete({
        param: { id: event!.id },
      });
      if (!res.ok) throw new Error("Nepodařilo se smazat událost");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Událost smazána");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmDelete(false);
    onOpenChange(next);
  }

  if (!event) return null;

  const color = calendarColorMap.get(event.calendarId) ?? "#8B6448";
  const calendar = userCalendars.find((c) => c.id === event.calendarId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        {/* Barevný pruh kalendáře nahoře */}
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: color }} />

        <DialogHeader className="px-6 pb-2 pt-5">
          <DialogTitle className="font-display text-xl font-semibold leading-snug">
            {event.title}
          </DialogTitle>
          <DialogDescription className="sr-only">Detail události</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 px-6 pb-5">
          {/* Datum a čas */}
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm leading-snug">
              {formatEventTime(event.startTime, event.endTime)}
            </span>
          </div>

          {/* Kalendář */}
          {calendar && (
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-muted-foreground">{calendar.name}</span>
            </div>
          )}

          {/* Opakování */}
          {event.recurrenceRule && (
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatRecurrenceRule(event.recurrenceRule)}
              </span>
            </div>
          )}

          {/* Popis */}
          {event.description && (
            <div className="flex items-start gap-3">
              <AlignLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Akční lišta */}
        <div className="flex items-center border-t bg-muted/30 px-6 py-4">
          {!confirmDelete ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-2xl text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                Smazat
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-2xl"
                  onClick={() => handleOpenChange(false)}
                >
                  Zavřít
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-2xl"
                  onClick={() => {
                    handleOpenChange(false);
                    onEdit();
                  }}
                >
                  Upravit
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">Opravdu smazat?</span>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-2xl"
                  onClick={() => setConfirmDelete(false)}
                >
                  Ne
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-2xl"
                  onClick={() => deleteEvent.mutate()}
                  disabled={deleteEvent.isPending}
                >
                  {deleteEvent.isPending ? "Mažu…" : "Smazat"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
