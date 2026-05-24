import { Hono } from "hono";
import { handle } from "hono/vercel";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";

// ─── Zod schémata ─────────────────────────────────────────────────────────────
// Vstupní data vždy přicházejí jako JSON string — proto datetime jako string,
// který Drizzle při insertu konvertujeme na Date objekt.

const createEventSchema = z.object({
  calendarId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
});

// .partial() udělá všechna pole optional — ideální pro PATCH (měníš jen co chceš)
const updateEventSchema = createEventSchema.omit({ calendarId: true }).partial();

// ─── Hono app ─────────────────────────────────────────────────────────────────
// basePath("/api") říká Hono, aby ořízl prefix /api z příchozí URL.
// Požadavek na /api/events tak matchuje route definovanou jako /events.

const app = new Hono().basePath("/api");

// KLÍČ PRO RPC: routes musí být jedna plynulá řetězová definice (.get().post()...).
// TypeScript tím dokáže z každé metody vyinferovat vstupní i výstupní typy.
// Kdybychom psali app.get(...); app.post(...) zvlášť, RPC typy by nefungovaly.

const routes = app
  .get("/events", async (c) => {
    const allEvents = await db.select().from(events);
    return c.json(allEvents);
  })

  .post("/events", zValidator("json", createEventSchema), async (c) => {
    // c.req.valid("json") vrátí již zvalidovaná a správně otypovaná data
    const body = c.req.valid("json");
    const [event] = await db
      .insert(events)
      .values({
        calendarId: body.calendarId,
        title: body.title,
        description: body.description,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
      })
      .returning(); // .returning() vrátí vložený řádek včetně vygenerovaného id
    return c.json(event, 201);
  })

  .get("/events/:id", async (c) => {
    const id = c.req.param("id");
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) return c.json({ error: "Not found" }, 404);
    return c.json(event);
  })

  .patch("/events/:id", zValidator("json", updateEventSchema), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const [event] = await db
      .update(events)
      .set({
        ...body,
        // Konverze jen pokud pole přišlo — jinak undefined a Drizzle ho přeskočí
        ...(body.startTime && { startTime: new Date(body.startTime) }),
        ...(body.endTime && { endTime: new Date(body.endTime) }),
      })
      .where(eq(events.id, id))
      .returning();
    if (!event) return c.json({ error: "Not found" }, 404);
    return c.json(event);
  })

  .delete("/events/:id", async (c) => {
    const id = c.req.param("id");
    const [deleted] = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning();
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  });

// Exportujeme POUZE typ — ne implementaci.
// Frontend importuje jen AppType, žádný serverový kód se do bundlu nedostane.
export type AppType = typeof routes;

// ─── Next.js route handlery ───────────────────────────────────────────────────
// handle() obalí Hono app do formátu, který Next.js App Router očekává (Web API Request/Response).
// Každou HTTP metodu musíme explicitně exportovat.
export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
