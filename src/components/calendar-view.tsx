"use client";

import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyAgenda } from "@/components/daily-agenda";
import { WeekGrid } from "@/components/week-grid";
import { apiClient } from "@/lib/client";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week";

const WEEKDAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function CalendarView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewMode = (searchParams.get("view") as ViewMode) ?? "month";

  function setViewMode(v: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`${pathname}?${params.toString()}`);
  }

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
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    return monthEvents.filter((event) => {
      const start = new Date(String(event.startTime));
      const end = new Date(String(event.endTime));
      return start <= dayEnd && end >= dayStart;
    });
  }

  function handleDayClick(day: Date) {
    setSelectedDay(day);
  }

  // Shared segmented toggle rendered in both month and week headers
  const viewToggle = (
    <div className="flex rounded-xl border bg-muted/30 p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 rounded-lg px-3 text-xs transition-colors",
          viewMode === "month" && "bg-background shadow-sm"
        )}
        onClick={() => setViewMode("month")}
      >
        Měsíc
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 rounded-lg px-3 text-xs transition-colors",
          viewMode === "week" && "bg-background shadow-sm"
        )}
        onClick={() => setViewMode("week")}
      >
        Týden
      </Button>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Týden: mobil = přirozená výška (flex-shrink), desktop = flex-1 */}
      <div className={cn(
        "flex flex-col overflow-hidden",
        viewMode === "week" ? "shrink-0 sm:min-h-0 sm:flex-1" : "min-h-0 flex-1"
      )}>
        {/* ── Měsíční navigační hlavička (skrytá v týdenním módu) ──────────── */}
        {viewMode === "month" && (
          <div className="flex items-center gap-3 px-5 py-4">
            <h2 className="font-display text-2xl font-semibold capitalize tracking-tight">
              {format(currentMonth, "LLLL yyyy", { locale: cs })}
            </h2>
            <div className="ml-auto flex items-center gap-2">
              {viewToggle}
              <div className="flex items-center gap-0.5">
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
          </div>
        )}

        {viewMode === "week" && (
          <WeekGrid
            selectedDay={selectedDay}
            onDaySelect={setSelectedDay}
            calendarColorMap={calendarColorMap}
            viewToggle={viewToggle}
          />
        )}

        {/* ── Měsíční mřížka ───────────────────────────────────────────────── */}
        {viewMode === "month" && (<>
        {/* ── Záhlaví dnů týdne ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 border-b border-border/40 px-px">
          {WEEKDAY_NAMES.map((name) => (
            <div
              key={name}
              className="section-label py-2 text-center"
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
                  "relative flex min-h-14 flex-col items-start overflow-hidden border-b border-r border-border/40 p-1.5 text-sm transition-colors",
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
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-medium transition-colors",
                    isTodayDate
                      ? "bg-primary font-semibold text-primary-foreground"
                      : isSelected && isCurrentMonth
                        ? "bg-primary/15 font-semibold text-primary ring-1 ring-primary/30"
                        : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/30"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Event chips */}
                <div className="mt-1 flex w-full min-w-0 flex-col gap-0.5">
                  {eventsLoading && isCurrentMonth ? (
                    <Skeleton className="h-4 w-full rounded-full" />
                  ) : null}
                  {!eventsLoading && (() => {
                    // Limit chips so the "+x more" row always fits:
                    // mobile = 1 chip max, desktop = 2 chips when ≤2 total, else 1
                    const desktopLimit = dayEvents.length > 2 ? 1 : 2;
                    return (
                      <>
                        {dayEvents.slice(0, desktopLimit).map((event, i) => {
                          const color =
                            calendarColorMap.get(event.calendarId) ?? "#8B6448";
                          const isAllDayEvent =
                            format(new Date(String(event.startTime)), "HH:mm") === "00:00";
                          return (
                            <div
                              key={`${event.id}-${String(event.startTime)}`}
                              className={cn("event-chip", i >= 1 && "hidden sm:block")}
                              style={{ backgroundColor: color }}
                              title={event.title}
                            >
                              {!isAllDayEvent && (
                                <span className="mr-0.5 opacity-75">
                                  {format(new Date(String(event.startTime)), "H:mm")}
                                </span>
                              )}
                              {event.title}
                            </div>
                          );
                        })}
                        {/* Mobile overflow */}
                        {dayEvents.length > 1 && (
                          <span className="px-1 text-[10px] text-muted-foreground sm:hidden">
                            +{dayEvents.length - 1} víc
                          </span>
                        )}
                        {/* Desktop overflow */}
                        {dayEvents.length > desktopLimit && (
                          <span className="hidden px-1 text-[10px] text-muted-foreground sm:block">
                            +{dayEvents.length - desktopLimit} víc
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>

                {hasNotes && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-note" />
                )}
              </button>
            );
          })}
        </div>
        </>)}
      </div>

      {/* ── Vždy viditelný spodní panel ───────────────────────────────────── */}
      <DailyAgenda
        day={selectedDay}
        calendarColorMap={calendarColorMap}
        expanded={viewMode === "week"}
      />
    </div>
  );
}
