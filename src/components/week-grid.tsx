"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  addWeeks,
  endOfDay,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/client";
import { cn } from "@/lib/utils";

const WEEK_CHIP_LIMIT = 6;

interface WeekGridProps {
  selectedDay: Date;
  onDaySelect: (day: Date) => void;
  calendarColorMap: Map<string, string>;
  /** Passed so the toggle can be rendered consistently with the month header */
  viewToggle: ReactNode;
}

export function WeekGrid({
  selectedDay,
  onDaySelect,
  calendarColorMap,
  viewToggle,
}: WeekGridProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(selectedDay, { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekKey = format(weekStart, "yyyy-MM-dd");

  const { data: weekEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events", weekKey],
    queryFn: async () => {
      const res = await apiClient.api.events.$get({
        query: { from: weekStart.toISOString(), to: weekEnd.toISOString() },
      });
      if (!res.ok) throw new Error("Nepodařilo se načíst události");
      return res.json();
    },
  });

  const { data: weekNotes = [] } = useQuery({
    queryKey: ["notes", weekKey],
    queryFn: async () => {
      const res = await apiClient.api.notes.$get({
        query: {
          from: format(weekStart, "yyyy-MM-dd"),
          to: format(weekEnd, "yyyy-MM-dd"),
        },
      });
      if (!res.ok) throw new Error("Nepodařilo se načíst poznámky");
      return res.json();
    },
  });

  const noteDateSet = useMemo(
    () =>
      new Set(
        (weekNotes as { targetDate: string | null }[])
          .map((n) => n.targetDate)
          .filter((d): d is string => d !== null)
      ),
    [weekNotes]
  );

  function getEventsForDay(day: Date) {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    return weekEvents.filter((event) => {
      const start = new Date(String(event.startTime));
      const end = new Date(String(event.endTime));
      return start <= dayEnd && end >= dayStart;
    });
  }

  const weekLabel = `${format(weekStart, "d. M.", { locale: cs })} – ${format(weekEnd, "d. M. yyyy", { locale: cs })}`;

  return (
    /* Mobil: přirozená výška — DailyAgenda dostane zbytek.
       Desktop: flex-1 vyplní prostor v CalendarView. */
    <div className="flex flex-col overflow-hidden sm:min-h-0 sm:flex-1">
      {/* ── Navigační hlavička ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {weekLabel}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {viewToggle}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
              aria-label="Předchozí týden"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              aria-label="Následující týden"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/*
       * Mřížka dnů:
       *   mobil  → flex-col: každý den je plný řádek (horizontální prostor)
       *   desktop → grid-cols-7: klasické 7 sloupců
       */}
      <div className="flex flex-col overflow-y-auto sm:min-h-0 sm:flex-1 sm:grid sm:grid-cols-7 sm:overflow-hidden">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDay);
          const isTodayDate = isToday(day);
          const dayEvents = getEventsForDay(day);
          const hasNotes = noteDateSet.has(format(day, "yyyy-MM-dd"));
          const chipLimit = dayEvents.length > WEEK_CHIP_LIMIT ? WEEK_CHIP_LIMIT - 1 : WEEK_CHIP_LIMIT;
          const overflowCount = dayEvents.length - chipLimit;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDaySelect(day)}
              className={cn(
                // Sdílené
                "relative text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
                "hover:bg-muted/40",
                isSelected && "bg-primary/5",
                // Mobil: řádek — den vlevo, chipy vpravo
                "flex flex-row items-start gap-3 border-b border-border/40 px-4 py-2",
                // Desktop: sloupec — den nahoře, chipy pod ním
                "sm:flex-col sm:items-start sm:gap-0 sm:border-r sm:overflow-hidden sm:px-0 sm:py-0 sm:p-1.5"
              )}
            >
              {/* ── Záhlaví dne ──────────────────────────────────────────── */}
              <div className={cn(
                // Mobil: pevná šířka, zkrácený název + kruh pod sebou
                "flex w-14 shrink-0 flex-col items-center gap-0.5",
                // Desktop: plná šířka, vycentrované
                "sm:mb-1.5 sm:w-full"
              )}>
                <span className="section-label">
                  {format(day, "EEE", { locale: cs })}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-medium transition-colors",
                    isTodayDate
                      ? "bg-primary font-semibold text-primary-foreground"
                      : isSelected
                        ? "bg-primary/15 font-semibold text-primary ring-1 ring-primary/30"
                        : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* ── Event chips ───────────────────────────────────────────── */}
              <div className={cn(
                // Mobil: flex-1, chipy se zalamují do více řádků
                "flex flex-1 flex-wrap items-start gap-1",
                // Desktop: plná šířka, chipy pod sebou
                "sm:flex-none sm:w-full sm:flex-col sm:flex-nowrap sm:gap-0.5"
              )}>
                {eventsLoading ? (
                  <>
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </>
                ) : (
                  <>
                    {dayEvents.slice(0, chipLimit).map((event) => {
                      const color =
                        calendarColorMap.get(event.calendarId) ?? "#8B6448";
                      const isAllDay =
                        format(new Date(String(event.startTime)), "HH:mm") === "00:00";
                      return (
                        <div
                          key={`${event.id}-${String(event.startTime)}`}
                          className="event-chip"
                          style={{ backgroundColor: color }}
                          title={event.title}
                        >
                          {!isAllDay && (
                            <span className="mr-0.5 opacity-75">
                              {format(new Date(String(event.startTime)), "H:mm")}
                            </span>
                          )}
                          {event.title}
                        </div>
                      );
                    })}
                    {overflowCount > 0 && (
                      <span className="px-1 text-[10px] text-muted-foreground">
                        +{overflowCount} víc
                      </span>
                    )}
                  </>
                )}
              </div>

              {hasNotes && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-note" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
