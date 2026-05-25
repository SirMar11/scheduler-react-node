"use client";

import { useEffect, useState } from "react";
import { format, getDay, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { AlignLeft, ChevronDown, Clock, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function getRecurrenceOptions(date: Date) {
  const dayName = format(date, "EEEE", { locale: cs });
  const dayOfMonth = format(date, "d.");
  const rruleDay = RRULE_DAYS[getDay(date)];

  return [
    { label: "Neopakovat", value: "none" },
    { label: "Každý den", value: "RRULE:FREQ=DAILY" },
    {
      label: `Každý týden (${dayName})`,
      value: `RRULE:FREQ=WEEKLY;BYDAY=${rruleDay}`,
    },
    { label: `Každý měsíc (${dayOfMonth})`, value: "RRULE:FREQ=MONTHLY" },
    { label: "Každý rok", value: "RRULE:FREQ=YEARLY" },
  ];
}

export type EditEventData = {
  id: string;
  calendarId: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  recurrenceRule?: string | null;
};

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  editEvent?: EditEventData | null;
}

export function EventForm({
  open,
  onOpenChange,
  initialDate,
  editEvent,
}: EventFormProps) {
  const isEditMode = !!editEvent;

  const todayStr = format(initialDate ?? new Date(), "yyyy-MM-dd");

  const [title, setTitle] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [calendarId, setCalendarId] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [description, setDescription] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const queryClient = useQueryClient();

  // Při otevření formuláře naplní pole daty editované události (edit mód)
  // nebo resetuje na výchozí hodnoty (create mód).
  useEffect(() => {
    if (!open) return;

    if (editEvent) {
      const evStart = new Date(String(editEvent.startTime));
      const evEnd = new Date(String(editEvent.endTime));
      setTitle(editEvent.title);
      setDescription(editEvent.description ?? "");
      setCalendarId(editEvent.calendarId);
      setRecurrence(editEvent.recurrenceRule ?? "none");
      const allDay = format(evStart, "HH:mm") === "00:00";
      setIsAllDay(allDay);
      setStartDate(format(evStart, "yyyy-MM-dd"));
      setEndDate(format(evEnd, "yyyy-MM-dd"));
      setStartTime(allDay ? "09:00" : format(evStart, "HH:mm"));
      setEndTime(allDay ? "10:00" : format(evEnd, "HH:mm"));
      setShowAdvanced(!!editEvent.description);
    } else {
      const base = format(initialDate ?? new Date(), "yyyy-MM-dd");
      setTitle("");
      setIsAllDay(true);
      setStartDate(base);
      setEndDate(base);
      setStartTime("09:00");
      setEndTime("10:00");
      setCalendarId("");
      setRecurrence("none");
      setDescription("");
      setShowAdvanced(false);
    }
  }, [open, editEvent]);

  const { data: userCalendars = [] } = useQuery({
    queryKey: ["calendars"],
    queryFn: async () => {
      const res = await apiClient.api.calendars.$get();
      if (!res.ok) throw new Error("Nepodařilo se načíst kalendáře");
      return res.json();
    },
  });

  // Pokud existuje právě jeden kalendář, předvyber ho automaticky.
  // useEffect reaguje na načtení dat — calendarId zůstane prázdný jen do té doby.
  useEffect(() => {
    if (userCalendars.length === 1 && !isEditMode && !calendarId) {
      setCalendarId(userCalendars[0].id);
    }
  }, [userCalendars, isEditMode, calendarId]);

  const selectedCalendar = userCalendars.find((c) => c.id === calendarId);

  const saveEvent = useMutation({
    mutationFn: async () => {
      let startISO: string;
      let endISO: string;

      if (isAllDay) {
        startISO = new Date(`${startDate}T00:00:00`).toISOString();
        endISO = new Date(`${endDate}T23:59:00`).toISOString();
      } else {
        startISO = new Date(`${startDate}T${startTime}:00`).toISOString();
        endISO = new Date(`${endDate}T${endTime}:00`).toISOString();
      }

      if (isEditMode && editEvent) {
        const res = await apiClient.api.events[":id"].$patch({
          param: { id: editEvent.id },
          json: {
            title,
            startTime: startISO,
            endTime: endISO,
            description: description || undefined,
            recurrenceRule: recurrence !== "none" ? recurrence : undefined,
          },
        });
        if (!res.ok) throw new Error("Nepodařilo se upravit událost");
        return res.json();
      } else {
        const res = await apiClient.api.events.$post({
          json: {
            calendarId,
            title,
            startTime: startISO,
            endTime: endISO,
            ...(description && { description }),
            ...(recurrence !== "none" && { recurrenceRule: recurrence }),
          },
        });
        if (!res.ok) throw new Error("Nepodařilo se vytvořit událost");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(isEditMode ? "Událost upravena" : "Událost vytvořena");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setTimeout(() => {
        const base = format(initialDate ?? new Date(), "yyyy-MM-dd");
        setTitle("");
        setIsAllDay(true);
        setStartDate(base);
        setEndDate(base);
        setStartTime("09:00");
        setEndTime("10:00");
        setCalendarId("");
        setRecurrence("none");
        setDescription("");
        setShowAdvanced(false);
      }, 150);
    }
    onOpenChange(nextOpen);
  }

  const isValid =
    title.trim().length > 0 &&
    (isEditMode || calendarId.length > 0) &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    startDate <= endDate &&
    (isAllDay || startDate < endDate || startTime < endTime);

  const refDate = startDate ? parseISO(startDate) : (initialDate ?? new Date());
  const recurrenceOptions = getRecurrenceOptions(refDate);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle className="font-display text-base font-medium text-muted-foreground">
            {isEditMode
              ? "Upravit událost"
              : format(refDate, "EEEE, d. MMMM yyyy", { locale: cs })}
          </DialogTitle>

          <DialogDescription className="sr-only">
            {isEditMode
              ? "Formulář pro úpravu kalendářní události"
              : "Formulář pro vytvoření nové kalendářní události"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid) saveEvent.mutate();
          }}
          className="flex flex-col"
        >
          {/* ── Název ────────────────────────────────────────────────────── */}
          <div className="px-6 pb-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Přidat název"
              className="rounded-none border-0 border-b border-border px-0 font-display text-xl font-semibold shadow-none placeholder:text-muted-foreground/50 focus-visible:border-b-primary focus-visible:ring-0"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-1 px-6 pb-4">
            {/* ── Datum + čas + celodenní přepínač ────────────────────── */}
            <div className="flex items-start gap-3 py-1.5">
              <Clock className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="h-8 w-auto text-sm"
                />
                {!isAllDay && (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-8 w-26 text-sm"
                  />
                )}
                <span className="text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="h-8 w-auto text-sm"
                />
                {!isAllDay && (
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-8 w-26 text-sm"
                  />
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 pt-1">
                <Label
                  htmlFor="allday"
                  className="cursor-pointer text-xs text-muted-foreground"
                >
                  Celý den
                </Label>
                <Switch
                  id="allday"
                  checked={isAllDay}
                  onCheckedChange={setIsAllDay}
                />
              </div>
            </div>

            {startDate > endDate && (
              <p className="ml-7 text-xs text-destructive">
                Datum konce musí být po datu začátku
              </p>
            )}
            {!isAllDay && startDate === endDate && startTime >= endTime && (
              <p className="ml-7 text-xs text-destructive">
                Čas konce musí být po čase začátku
              </p>
            )}

            {/* ── Výběr kalendáře ──────────────────────────────────────── */}
            {!isEditMode && userCalendars.length > 1 && (
              <div className="flex items-center gap-3 py-1.5">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <span
                    className="h-3 w-3 rounded-full transition-colors"
                    style={{
                      backgroundColor: selectedCalendar?.colorHex ?? "#94a3b8",
                    }}
                  />
                </div>
                <Select
                  value={calendarId}
                  onValueChange={setCalendarId}
                  required
                >
                  <SelectTrigger className="h-8 flex-1 text-sm">
                    <SelectValue placeholder="Vyberte kalendář" />
                  </SelectTrigger>
                  <SelectContent>
                    {userCalendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: cal.colorHex }}
                          />
                          {cal.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Opakování ────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 py-1.5">
              <RefreshCw className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="h-8 flex-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Více možností (popis) ─────────────────────────────────── */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      showAdvanced && "rotate-180"
                    )}
                  />
                  <span className="text-xs">
                    {showAdvanced ? "Méně možností" : "Více možností"}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex items-start gap-3 pb-2 pt-1">
                  <AlignLeft className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Přidat popis nebo poznámku..."
                    className="min-h-20 resize-none text-sm"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {saveEvent.isError && (
            <p className="px-6 pb-2 text-sm text-destructive">
              {saveEvent.error.message}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-2xl"
              onClick={() => handleOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-2xl"
              disabled={!isValid || saveEvent.isPending}
            >
              {saveEvent.isPending
                ? "Ukládám..."
                : isEditMode
                  ? "Uložit změny"
                  : "Uložit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
