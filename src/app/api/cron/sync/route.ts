// Runs hourly via Vercel Cron — auto-syncs all connected Airbnb/iCal feeds
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchIcal, saveIcalEvents } from "@/app/api/external/route";

export async function GET(req: NextRequest) {
  // Vercel cron jobs send this header; reject all other callers
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const hasSecret = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!isVercelCron && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncs = await prisma.externalCalendarSync.findMany({
    where: { isActive: true, icalUrl: { not: "file-upload" } },
    include: { property: { include: { spaces: { take: 1 } } } },
  });

  const results: Array<{ id: string; name: string | null; ok: boolean; saved?: number; error?: string }> = [];
  for (const sync of syncs) {
    try {
      const icalText = await fetchIcal(sync.icalUrl);
      const { saved } = await saveIcalEvents(sync.id, sync.property.spaces[0]?.id, icalText);
      await prisma.externalCalendarSync.update({ where: { id: sync.id }, data: { lastSyncedAt: new Date() } });
      results.push({ id: sync.id, name: sync.calendarName, saved, ok: true });
    } catch (e) {
      results.push({ id: sync.id, name: sync.calendarName, error: (e as Error).message, ok: false });
    }
  }

  console.log(`[cron] synced ${results.filter(r=>r.ok).length}/${syncs.length} calendars`);
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results });
}
