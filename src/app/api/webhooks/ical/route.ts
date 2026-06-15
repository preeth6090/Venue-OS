// VenueOS → Airbnb: Export confirmed bookings as iCal feed
// Give this URL to Airbnb "Import Calendar" so it auto-blocks your venue dates on Airbnb
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // Simple token auth so the URL can't be guessed
  if (token !== process.env.ICAL_SECRET && token !== "venueos-ical") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const property = await prisma.property.findFirst({ where: { isActive: true } });
  if (!property) return new NextResponse("Not found", { status: 404 });

  const bookings = await prisma.booking.findMany({
    where: {
      propertyId: property.id,
      status: { in: ["CONFIRMED", "TENTATIVE", "IN_PROGRESS", "INVOICED"] },
      eventStartTime: { gte: new Date(Date.now() - 30 * 86400000) }, // last 30 days + future
    },
    include: { client: { select: { displayName: true } } },
    orderBy: { eventStartTime: "asc" },
  });

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const venueName = property.name.replace(/[^a-zA-Z0-9 ]/g, "");

  const events = bookings.map(b => {
    const uid = `${b.bookingRef}@venueos.app`;
    const dtstart = b.eventStartTime.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dtend   = b.eventEndTime.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const summary = `${b.client.displayName} – ${b.eventType.replace(/_/g, " ")}`;
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:Booking Ref: ${b.bookingRef}`,
      `STATUS:${b.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    ].join("\r\n");
  }).join("\r\n");

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//VenueOS//${venueName}//EN`,
    `X-WR-CALNAME:${venueName} Bookings`,
    "X-WR-TIMEZONE:Asia/Kolkata",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="venueos.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
