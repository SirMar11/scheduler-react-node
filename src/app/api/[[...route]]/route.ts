import { Hono } from "hono";
import { handle } from "hono/vercel";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, gte, lte, inArray, isNull } from "drizzle-orm";
import { rrulestr } from "rrule";
import { db } from "@/db";
import { events, calendars, notes } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authMiddleware = createMiddleware<{
  Variables: { userId: string };
}>(async (c, next) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new HTTPException(401, { message: "Unauthorized" });

  c.set("userId", user.id);
  await next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Vrátí ID všech kalendářů patřících uživateli (nebo prázdné pole).
async function getUserCalendarIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: calendars.id })
    .from(calendars)
    .where(eq(calendars.userId, userId));
  return rows.map((r) => r.id);
}

// ─── Zod schémata ─────────────────────────────────────────────────────────────

const createEventSchema = z.object({
  calendarId: z.uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  recurrenceRule: z.string().max(1000).optional(),
});

const updateEventSchema = createEventSchema.omit({ calendarId: true }).partial();

const createCalendarSchema = z.object({
  name: z.string().min(1).max(255),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Musí být validní hex barva (#RRGGBB)")
    .default("#3B82F6"),
});

const updateCalendarSchema = createCalendarSchema.partial();

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formát YYYY-MM-DD");

const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  targetDate: dateString.optional(),
  eventId: z.uuid().optional(),
});

const updateNoteSchema = createNoteSchema.partial();

// ─── Hono app ─────────────────────────────────────────────────────────────────

const app = new Hono<{ Variables: { userId: string } }>().basePath("/api");

const routes = app
  .use("*", authMiddleware)

  // ── Events ────────────────────────────────────────────────────────────────

  .get(
    "/events",
    zValidator(
      "query",
      z.object({
        from: z.iso.datetime(),
        to: z.iso.datetime(),
      })
    ),
    async (c) => {
      const userId = c.get("userId");
      const { from, to } = c.req.valid("query");

      const calendarIds = await getUserCalendarIds(userId);
      if (calendarIds.length === 0) return c.json([]);

      const fromDate = new Date(from);
      const toDate = new Date(to);

      // Lookback 1 rok — zachytí opakující se události vytvořené v minulosti.
      const lookbackLimit = new Date(fromDate.getTime() - 366 * 24 * 60 * 60 * 1000);

      const baseEvents = await db
        .select()
        .from(events)
        .where(
          and(
            inArray(events.calendarId, calendarIds),
            gte(events.startTime, lookbackLimit),
            lte(events.startTime, toDate)
          )
        );

      // Expanze opakujících se událostí pomocí rrule.
      // Neopakující se události procházejí beze změny (jen filtr rozsahu).
      const result: typeof baseEvents = [];

      for (const event of baseEvents) {
        if (!event.recurrenceRule) {
          // Neopakující: zahrň pokud událost překrývá rozsah [from, to]
          // (zachytí i vícedenní události začínající před from)
          if (event.startTime <= toDate && event.endTime >= fromDate) {
            result.push(event);
          }
          continue;
        }

        try {
          const duration = event.endTime.getTime() - event.startTime.getTime();
          const rule = rrulestr(event.recurrenceRule, {
            dtstart: event.startTime,
          });
          const occurrences = rule.between(fromDate, toDate, true).slice(0, 100);

          for (const occ of occurrences) {
            result.push({
              ...event,
              startTime: occ,
              endTime: new Date(occ.getTime() + duration),
            });
          }
        } catch {
          // Poškozený RRULE string — zobraz originální event pokud je v rozsahu
          if (event.startTime >= fromDate) {
            result.push(event);
          }
        }
      }

      return c.json(result);
    }
  )

  .post("/events", zValidator("json", createEventSchema), async (c) => {
    const body = c.req.valid("json");

    // Pravidlo bez COUNT/UNTIL by se opakovalo donekonečna — omezíme na 100 výskytů.
    let recurrenceRule = body.recurrenceRule;
    if (
      recurrenceRule &&
      !recurrenceRule.includes("COUNT=") &&
      !recurrenceRule.includes("UNTIL=")
    ) {
      recurrenceRule += ";COUNT=100";
    }

    const [event] = await db
      .insert(events)
      .values({
        calendarId: body.calendarId,
        title: body.title,
        description: body.description,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        recurrenceRule,
      })
      .returning();
    return c.json(event, 201);
  })

  .get("/events/:id", async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    const calendarIds = await getUserCalendarIds(userId);
    if (calendarIds.length === 0) return c.json({ error: "Not found" }, 404);

    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), inArray(events.calendarId, calendarIds)));
    if (!event) return c.json({ error: "Not found" }, 404);
    return c.json(event);
  })

  .patch("/events/:id", zValidator("json", updateEventSchema), async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    const body = c.req.valid("json");

    const calendarIds = await getUserCalendarIds(userId);
    if (calendarIds.length === 0) return c.json({ error: "Not found" }, 404);

    const { startTime, endTime, ...rest } = body;

    const [event] = await db
      .update(events)
      .set({
        ...rest,
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
      })
      .where(and(eq(events.id, id), inArray(events.calendarId, calendarIds)))
      .returning();
    if (!event) return c.json({ error: "Not found" }, 404);
    return c.json(event);
  })

  .delete("/events/:id", async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");

    const calendarIds = await getUserCalendarIds(userId);
    if (calendarIds.length === 0) return c.json({ error: "Not found" }, 404);

    const [deleted] = await db
      .delete(events)
      .where(and(eq(events.id, id), inArray(events.calendarId, calendarIds)))
      .returning();
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  })

  // ── Calendars ─────────────────────────────────────────────────────────────

  .get("/calendars", async (c) => {
    const userId = c.get("userId");
    let userCalendars = await db
      .select()
      .from(calendars)
      .where(eq(calendars.userId, userId));

    // První přihlášení — automaticky vytvoříme výchozí kalendář.
    // Budoucí sdílené kalendáře budou přidávány jiným mechanismem (pozvánky apod.).
    if (userCalendars.length === 0) {
      const [defaultCalendar] = await db
        .insert(calendars)
        .values({ name: "Můj kalendář", colorHex: "#3B82F6", userId })
        .returning();
      userCalendars = [defaultCalendar];
    }

    return c.json(userCalendars);
  })

  .post("/calendars", zValidator("json", createCalendarSchema), async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [calendar] = await db
      .insert(calendars)
      .values({ ...body, userId })
      .returning();
    return c.json(calendar, 201);
  })

  .patch(
    "/calendars/:id",
    zValidator("json", updateCalendarSchema),
    async (c) => {
      const id = c.req.param("id");
      const userId = c.get("userId");
      const body = c.req.valid("json");
      const [calendar] = await db
        .update(calendars)
        .set(body)
        .where(and(eq(calendars.id, id), eq(calendars.userId, userId)))
        .returning();
      if (!calendar) return c.json({ error: "Not found" }, 404);
      return c.json(calendar);
    }
  )

  .delete("/calendars/:id", async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    const [deleted] = await db
      .delete(calendars)
      .where(and(eq(calendars.id, id), eq(calendars.userId, userId)))
      .returning();
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  })

  // ── Notes ──────────────────────────────────────────────────────────────────

  .get(
    "/notes",
    zValidator(
      "query",
      z.object({ from: dateString.optional(), to: dateString.optional() })
    ),
    async (c) => {
      const userId = c.get("userId");
      const { from, to } = c.req.valid("query");

      // Bez from/to → plovoucí poznámky (targetDate IS NULL).
      // S from/to → poznámky pro dané datové rozmezí.
      const userNotes = await db
        .select()
        .from(notes)
        .where(
          from && to
            ? and(
                eq(notes.userId, userId),
                gte(notes.targetDate, from),
                lte(notes.targetDate, to)
              )
            : and(eq(notes.userId, userId), isNull(notes.targetDate))
        );
      return c.json(userNotes);
    }
  )

  .post("/notes", zValidator("json", createNoteSchema), async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [note] = await db.insert(notes).values({ ...body, userId }).returning();
    return c.json(note, 201);
  })

  .patch("/notes/:id", zValidator("json", updateNoteSchema), async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    const body = c.req.valid("json");
    const [note] = await db
      .update(notes)
      .set(body)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    if (!note) return c.json({ error: "Not found" }, 404);
    return c.json(note);
  })

  .delete("/notes/:id", async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    const [deleted] = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  });

export type AppType = typeof routes;

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
