import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function getProperty(email: string) {
  return prisma.property.findFirst({
    where: { organization: { users: { some: { email } } } },
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await getProperty(session.email);
  if (!property) return NextResponse.json([]);

  const bookings = await prisma.booking.findMany({
    where: { propertyId: property.id },
    include: {
      client: { select: { displayName: true } },
      bookingSpaces: { include: { space: { select: { name: true } } }, take: 1 },
    },
    orderBy: { eventStartTime: "asc" },
  });

  return NextResponse.json(bookings.map(b => ({
    id: b.id,
    ref: b.bookingRef,
    client: b.client.displayName,
    event: b.eventType.replace(/_/g, " "),
    space: b.bookingSpaces[0]?.space.name ?? "—",
    date: b.eventStartTime.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }),
    day: b.eventStartTime.getDate(),
    pax: b.expectedPax,
    amount: "₹" + Number(b.quotedAmount).toLocaleString("en-IN"),
    status: b.status,
  })));
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const property = await getProperty(session.email);
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  let client = await prisma.client.findFirst({ where: { displayName: body.client } });
  if (!client) {
    client = await prisma.client.create({
      data: { legalName: body.client, displayName: body.client, clientType: "Individual", stateCode: "29", stateName: "Karnataka" },
    });
  }

  const space = await prisma.space.findFirst({ where: { propertyId: property.id, name: body.space } });
  const count = await prisma.booking.count();
  const ref = `BK-2425-${String(count + 110).padStart(4, "0")}`;
  const eventDate = body.date ? new Date(body.date) : new Date();
  const startTime = new Date(eventDate); startTime.setHours(10, 0, 0);
  const endTime = new Date(eventDate); endTime.setHours(18, 0, 0);
  const amount = parseFloat((body.quotedAmount || "0").toString().replace(/[^\d.]/g, "")) || 0;

  const booking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      clientId: client.id,
      bookingRef: ref,
      status: (body.status || "TENTATIVE") as any,
      source: "DIRECT" as any,
      eventType: (body.event?.toUpperCase().replace(/ /g, "_") || "OTHER") as any,
      setupStartTime: new Date(startTime.getTime() - 2 * 3600000),
      eventStartTime: startTime,
      eventEndTime: endTime,
      teardownEndTime: new Date(endTime.getTime() + 2 * 3600000),
      expectedPax: parseInt(body.pax) || 0,
      quotedAmount: amount,
      ...(space ? { bookingSpaces: { create: { spaceId: space.id, startTime, endTime, baseRate: amount, finalRate: amount } } } : {}),
    },
    include: { client: true, bookingSpaces: { include: { space: true } } },
  });

  return NextResponse.json({
    id: booking.id, ref: booking.bookingRef, client: booking.client.displayName,
    event: booking.eventType.replace(/_/g, " "),
    space: booking.bookingSpaces[0]?.space.name ?? body.space ?? "—",
    date: booking.eventStartTime.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }),
    day: booking.eventStartTime.getDate(), pax: booking.expectedPax,
    amount: "₹" + Number(booking.quotedAmount).toLocaleString("en-IN"),
    status: booking.status,
  }, { status: 201 });
}
