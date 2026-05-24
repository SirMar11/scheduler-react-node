"use client";

import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyAgenda } from "@/components/daily-agenda";
import { apiClient } from "@/lib/client";
import { cn } from "@/lib/utils";

const WEEKDAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date())
  );
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const days = getCalendarDays(currentMonth);
  const weeksCount = days.length / 7;

  // ── Fetch kalendářů pro barvy ──────────────────────────────────────────────
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

  // ── Fetch událostí pro zobrazovaný měsíc ───────────────────────────────────
  const { data: monthEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const from = startOfWeek(startOfMonth(currentMonth), {
        weekStartsOn: 1,
      }).toISOString();
      const to = endOfWeek(endOfMonth(currentMonth), {
        weekStartsOn: 1,
      }).toISOString();

      const res = await apiClient.api.events.$get({ query: { from, to } });
      if (!res.ok) throw new Error("Nepodařilo se načíst události");
      return res.json();
    },
  });

  // ── Fetch poznámek pro zobrazovaný měsíc ──────────────────────────────────
  const { data: monthNotes = [] } = useQuery({
    queryKey: ["notes", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const from = format(
        startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      const to = format(
        endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      const res = await apiClient.api.notes.$get({ query: { from, to } });
      if (!res.ok) throw new Error("Nepodařilo se načíst poznámky");
      return res.json();
    },
  });

  const noteDateSet = useMemo(
    () =>
      new Set(
        (monthNotes as { targetDate: string | null }[])
          .map((n) => n.targetDate)
          .filter((d): d is string => d !== null)
      ),
    [monthNotes]
  );

  function getEventsForDay(day: Date) {
    return monthEvents.filter((event) =>
      isSameDay(new Date(String(event.startTime)), day)
    );
  }

  function handleDayClick(day: Date) {
    setSelectedDay(day);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* ── Navigační hlavička ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {format(currentMonth, "LLLL yyyy", { locale: cs })}
          </h2>
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              aria-label="Předchozí měsíc"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              aria-label="Následující měsíc"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Záhlaví dnů týdne ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 border-b border-border/40 px-px">
          {WEEKDAY_NAMES.map((name) => (
            <div
              key={name}
              className="py-2 text-center text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70"
            >
              {name}
            </div>
          ))}
        </div>

        {/* ── Mřížka dnů ───────────────────────────────────────────────────── */}
        <div
          className="grid min-h-0 flex-1 grid-cols-7"
          style={{ gridTemplateRows: `repeat(${weeksCount}, 1fr)` }}
        >
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDay);
            const isTodayDate = isToday(day);
            const dayEvents = getEventsForDay(day);
            const hasNotes = noteDateSet.has(format(day, "yyyy-MM-dd"));

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative flex flex-col items-start border-b border-r border-border/40 p-2 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
                  isCurrentMonth
                    ? "hover:bg-muted/40"
                    : "bg-muted/10 text-muted-foreground/30 hover:bg-muted/20",
                  isSelected && isCurrentMonth && "bg-primary/5"
                )}
              >
                {/* Číslo dne */}
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isTodayDate
                      ? "bg-primary text-primary-foreground font-semibold"
                      : isSelected && isCurrentMonth
                        ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30"
                        : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/30"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Bločky událostí / skeleton */}
                <div className="mt-1 flex w-full flex-col gap-0.5">
                  {eventsLoading && isCurrentMonth ? (
                    <Skeleton className="h-4 w-full rounded" />
                  ) : null}
                  {!eventsLoading &&
                    dayEvents.slice(0, 3).map((event) => {
                      const color =
                        calendarColorMap.get(event.calendarId) ?? "#64748b";
                      const isAllDay =
                        format(
                          new Date(String(event.startTime)),
                          "HH:mm"
                        ) === "00:00";

                      return (
                        <div
                          key={event.id}
                          className="truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-snug text-white"
                          style={{ backgroundColor: color }}
                          title={event.title}
                        >
                          {!isAllDay && (
                            <span className="mr-1 opacity-80">
                              {format(
                                new Date(String(event.startTime)),
                                "H:mm"
                              )}
                            </span>
                          )}
                          {event.title}
                        </div>
                      );
                    })}
                  {!eventsLoading && dayEvents.length > 3 && (
                    <span className="px-1 text-[11px] text-muted-foreground">
                      +{dayEvents.length - 3} další
                    </span>
                  )}
                </div>

                {/* Tečka = tento den má poznámku */}
                {hasNotes && (
                  <span className="absolute right-2 top-2.5 h-1 w-1 rounded-full bg-violet-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Vždy viditelný spodní panel ───────────────────────────────────── */}
      <DailyAgenda
        day={selectedDay}
        events={getEventsForDay(selectedDay)}
        calendarColorMap={calendarColorMap}
      />
    </div>
  );
}
