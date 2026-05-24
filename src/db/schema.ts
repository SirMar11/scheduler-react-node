import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// ─── USERS ───────────────────────────────────────────────────────────────────
// Zrcadlí auth.users ze Supabase. ID nepřiřazujeme my — přichází z Supabase Auth.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── CALENDARS ────────────────────────────────────────────────────────────────
export const calendars = pgTable("calendars", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  colorHex: varchar("color_hex", { length: 7 }).notNull().default("#3B82F6"),
});

// ─── EVENTS ───────────────────────────────────────────────────────────────────
export const events = pgTable("events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  // RRULE string, např. "RRULE:FREQ=WEEKLY;BYDAY=MO,WE"
  recurrenceRule: varchar("recurrence_rule", { length: 1000 }),
  // Odkaz na rodičovskou událost — tento event je výjimkou ze série.
  // AnyPgColumn řeší self-referenci (cyklický import by TypeScript odmítl).
  parentEventId: uuid("parent_event_id").references(
    (): AnyPgColumn => events.id,
    { onDelete: "cascade" }
  ),
});

// ─── NOTES ───────────────────────────────────────────────────────────────────
export const notes = pgTable("notes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Obě vazby jsou nullable — note může stát samostatně, být navázán na den,
  // nebo na konkrétní událost.
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  targetDate: date("target_date"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
});

// ─── RELATIONS (pro Drizzle query API) ────────────────────────────────────────
// Relations jsou metadata pouze pro TypeScript/Drizzle — negenerují SQL cizí klíče.
// Ty jsou definovány výše přes .references(). Relations umožňují db.query.users.findMany({ with: { calendars: true } })

export const usersRelations = relations(users, ({ many }) => ({
  calendars: many(calendars),
  notes: many(notes),
}));

export const calendarsRelations = relations(calendars, ({ one, many }) => ({
  user: one(users, {
    fields: [calendars.userId],
    references: [users.id],
  }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  calendar: one(calendars, {
    fields: [events.calendarId],
    references: [calendars.id],
  }),
  // Rodičovská událost (tato je výjimkou z její série)
  parentEvent: one(events, {
    fields: [events.parentEventId],
    references: [events.id],
    relationName: "event_exceptions",
  }),
  // Výjimky patřící k této sérii
  childEvents: many(events, {
    relationName: "event_exceptions",
  }),
  note: one(notes, {
    fields: [events.id],
    references: [notes.eventId],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [notes.eventId],
    references: [events.id],
  }),
}));