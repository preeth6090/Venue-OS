import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, eventType, pax, space, startTime, endTime, notes } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const property = await prisma.property.findFirst({ where: { isActive: true } });
  if (!property) return NextResponse.json({ error: "No property found" }, { status: 404 });

  let client = await prisma.client.findFirst({ where: { phone } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        legalName: name, displayName: name, clientType: "Individual",
        phone, email, stateCode: "29", stateName: "Karnataka",
      },
    });
  }

  await prisma.lead.create({
    data: {
      propertyId: property.id,
      clientId: client.id,
      contactName: name,
      contactPhone: phone,
      contactEmail: email || null,
      eventType: (eventType?.toUpperCase().replace(/ /g, "_") || "OTHER") as any,
      expectedPax: parseInt(pax) || null,
      status: "NEW",
      source: "WEBSITE" as any,
      notes,
    },
  });

  await prisma.notificationLog.create({
    data: {
      channel: "SMS",
      recipient: phone,
      subject: "Booking Enquiry Received",
      body: `Hi ${name}, your enquiry for ${property.name} has been received. Our team will contact you within 2 hours.`,
      entityType: "Lead",
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true, message: "Enquiry submitted successfully" });
}
