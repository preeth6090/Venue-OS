import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await prisma.property.findFirst({ where: { organization: { users: { some: { email: session.email } } } } });
  if (!property) return NextResponse.json({ bookedDays: [], externalDays: [] });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const y = parseInt(searchParams.get("year") ?? String(now.getFullYear()));
  const m = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1)) - 1; // 0-indexed
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 0);

  const bookings = await prisma.booking.findMany({
    where: { propertyId: property.id, eventStartTime: { gte: monthStart, lte: monthEnd }, status: { notIn: ["CANCELLED","NO_SHOW"] } },
    include: { client: { select: { displayName: true } } },
  });

  const bookedDays = bookings.map(b => ({ day: b.eventStartTime.getDate(), ref: b.bookingRef, client: b.client.displayName, event: b.eventType.replace(/_/g," "), status: b.status }));
  const blocked = await prisma.blockedSlot.findMany({ where: { space: { propertyId: property.id }, startTime: { gte: monthStart, lte: monthEnd } }, select: { startTime: true } });
  const externalDays = [...new Set(blocked.map(b => b.startTime.getDate()))];

  return NextResponse.json({ bookedDays, externalDays });
}
