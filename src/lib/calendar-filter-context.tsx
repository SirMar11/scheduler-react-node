"use client";

import { createContext, useContext, useState } from "react";

interface CalendarFilterContextValue {
  hiddenIds: Set<string>;
  toggle: (id: string) => void;
  isVisible: (id: string) => boolean;
}

const CalendarFilterContext = createContext<CalendarFilterContextValue | null>(
  null
);

export function CalendarFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isVisible(id: string) {
    return !hiddenIds.has(id);
  }

  return (
    <CalendarFilterContext.Provider value={{ hiddenIds, toggle, isVisible }}>
      {children}
    </CalendarFilterContext.Provider>
  );
}

export function useCalendarFilter() {
  const ctx = useContext(CalendarFilterContext);
  if (!ctx)
    throw new Error(
      "useCalendarFilter musí být použit uvnitř CalendarFilterProvider"
    );
  return ctx;
}
