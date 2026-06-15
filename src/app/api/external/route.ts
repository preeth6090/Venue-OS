import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Run in Singapore — closest to Indian Airbnb servers, less likely to be blocked
export const preferredRegion = "sin1";

export function parseIcal(text: string) {
  const events: { uid: string; summary: string; start: Date; end: Date }[] = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}[^:]*:([^\r\n]+)`));
      return match ? match[1].trim() : "";
    };
    const parseDate = (s: string): Date | null => {
      if (!s) return null;
      const c = s.replace(/[TZ]/g, "").replace(/-/g, "");
      if (c.length >= 8) {
        const y=parseInt(c.slice(0,4)),m=parseInt(c.slice(4,6))-1,d=parseInt(c.slice(6,8));
        const h=c.length>=10?parseInt(c.slice(8,10)):0,mn=c.length>=12?parseInt(c.slice(10,12)):0;
        return new Date(Date.UTC(y,m,d,h,mn));
      }
      return null;
    };
    const uid=get("UID")||`evt-${i}`, summary=get("SUMMARY")||"Airbnb Block";
    const start=parseDate(get("DTSTART")), end=parseDate(get("DTEND")||get("DTSTART"));
    if(start&&end) events.push({uid,summary,start,end});
  }
  return events;
}

// Fetch iCal — run all strategies IN PARALLEL, first valid response wins
// Total budget: 8s (Vercel Hobby limit is 10s)
export async function fetchIcal(icalUrl: string): Promise<string> {
  const tryFetch = async (fetcher: () => Promise<string>): Promise<string | null> => {
    try { return await fetcher(); } catch { return null; }
  };

  const results = await Promise.allSettled([
    // Direct
    tryFetch(async () => {
      const r = await fetch(icalUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      if (!t.includes("BEGIN:VCALENDAR")) throw new Error("Not iCal");
      return t;
    }),
    // allorigins.win proxy
    tryFetch(async () => {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(icalUrl)}`, {
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) throw new Error(`Proxy HTTP ${r.status}`);
      const j = await r.json();
      if (!j.contents?.includes("BEGIN:VCALENDAR")) throw new Error("Not iCal");
      return j.contents as string;
    }),
    // corsproxy.io
    tryFetch(async () => {
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(icalUrl)}`, {
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) throw new Error(`Proxy2 HTTP ${r.status}`);
      const t = await r.text();
      if (!t.includes("BEGIN:VCALENDAR")) throw new Error("Not iCal");
      return t;
    }),
  ]);

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) return r.value;
  }

  throw new Error("All fetch methods failed. Please use the file upload option.");
}

export async function saveIcalEvents(syncId: string, spaceId: string | undefined, icalText: string) {
  const all = parseIcal(icalText);
  const future = all.filter(e => e.end > new Date());
  let saved = 0;
  for (const ev of future) {
    try {
      await prisma.externalCalendarEvent.upsert({
        where: { syncId_uid: { syncId, uid: ev.uid } },
        update: { summary: ev.summary, startTime: ev.start, endTime: ev.end, updatedAt: new Date() },
        create: { syncId, uid: ev.uid, summary: ev.summary, startTime: ev.start, endTime: ev.end, isBlocking: true, rawPayload: {} },
      });
      if (spaceId) {
        const exists = await prisma.blockedSlot.findFirst({ where: { spaceId, startTime: ev.start, endTime: ev.end } });
        if (!exists) await prisma.blockedSlot.create({ data: { spaceId, startTime: ev.start, endTime: ev.end, reason: `Airbnb: ${ev.summary}` } });
      }
      saved++;
    } catch { /* skip */ }
  }
  return { saved, total: all.length };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const syncs = await prisma.externalCalendarSync.findMany({
      where: { property: { organization: { users: { some: { email: session.email } } } }, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(syncs.map(s => ({
      id: s.id, provider: s.provider, calendarName: s.calendarName || "Airbnb",
      icalUrl: s.icalUrl, lastSyncedAt: s.lastSyncedAt, isActive: s.isActive,
    })));
  } catch { return NextResponse.json([]); }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await req.json();
  const { icalUrl, icalContent, calendarName, syncId } = body;
  if (!icalUrl && !icalContent) return NextResponse.json({ error: "Provide iCal URL or file content" }, { status: 400 });

  const property = await prisma.property.findFirst({
    where: { organization: { users: { some: { email: session.email } } } },
    include: { spaces: { take: 1 } },
  });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  let icalText = icalContent || "";
  if (!icalText) {
    try { icalText = await fetchIcal(icalUrl); }
    catch (e) {
      return NextResponse.json({ error: (e as Error).message, useFileUpload: true }, { status: 422 });
    }
  }

  const sync = await prisma.externalCalendarSync.upsert({
    where: { id: syncId || "00000000-0000-0000-0000-000000000000" },
    update: { calendarName: calendarName || "Airbnb", lastSyncedAt: new Date(), ...(icalUrl ? { icalUrl } : {}) },
    create: { propertyId: property.id, provider: "AIRBNB" as any, calendarName: calendarName || "Airbnb", icalUrl: icalUrl || "file-upload", lastSyncedAt: new Date() },
  });

  const { saved, total } = await saveIcalEvents(sync.id, property.spaces[0]?.id, icalText);
  return NextResponse.json({ ok: true, syncId: sync.id, eventsImported: saved, totalInFeed: total, calendarName: sync.calendarName });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.externalCalendarSync.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
