import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not set. Add it to .env.local — free at console.groq.com" },
      { status: 503 }
    );
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const property = await prisma.property.findFirst({
    where: { organization: { users: { some: { email: session.email } } } },
  });

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [leads, bookings, invoices] = await Promise.all([
    prisma.lead.findMany({
      where: {
        propertyId: property?.id ?? undefined,
        status: { notIn: ["CONVERTED", "LOST", "JUNK"] },
      },
      include: { client: { select: { displayName: true } } },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
    prisma.booking.findMany({
      where: {
        propertyId: property?.id ?? undefined,
        status: { in: ["CONFIRMED", "TENTATIVE"] },
        eventStartTime: { gte: now, lte: sevenDaysOut },
      },
      include: { client: { select: { displayName: true } } },
      take: 6,
    }),
    prisma.invoice.findMany({
      where: {
        booking: { propertyId: property?.id ?? undefined },
        status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] },
      },
      include: { client: { select: { displayName: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  const context = {
    today: now.toDateString(),
    activeLeads: leads.map((l) => ({
      name: l.client?.displayName ?? l.contactName ?? "Unknown",
      status: l.status,
      eventType: l.eventType,
      daysSinceCreated: Math.floor((now.getTime() - l.createdAt.getTime()) / 86400000),
      nextFollowUp: l.nextFollowUpAt?.toDateString() ?? null,
      budget: l.budgetMax ? `₹${(Number(l.budgetMax) / 1000).toFixed(0)}K` : null,
    })),
    upcomingBookings: bookings.map((b) => ({
      client: b.client.displayName,
      eventType: b.eventType,
      date: b.eventStartTime.toDateString(),
      ref: b.bookingRef,
      status: b.status,
    })),
    unpaidInvoices: invoices.map((i) => ({
      client: i.client.displayName,
      amount: `₹${Number(i.totalAmount).toLocaleString("en-IN")}`,
      dueDate: i.dueDate.toDateString(),
      overdue: i.dueDate < now,
    })),
  };

  const prompt = `You are a smart business assistant for a venue operations company. Analyze this data and generate 5-7 specific, prioritized tasks the team must act on today or this week.

Data:
${JSON.stringify(context, null, 2)}

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "title": "Short clear action (max 60 chars)",
    "description": "Specific detail: who, what amount, why urgent",
    "priority": "HIGH" or "MEDIUM" or "NORMAL",
    "category": "FOLLOW_UP" or "FINANCE" or "OPERATIONS" or "ADMIN",
    "relatedRef": "client name or booking ref or null",
    "deadline": "YYYY-MM-DD or null"
  }
]

Priority rules:
- HIGH = event in < 3 days, lead > 3 days without contact, overdue invoice > ₹50K
- MEDIUM = lead 2-3 days old, invoice due in < 7 days, tentative booking needs confirmation
- NORMAL = preparation, admin, routine follow-up

Use real names and amounts from the data. Be specific and actionable.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    const tasks = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "AI generation failed" }, { status: 500 });
  }
}
