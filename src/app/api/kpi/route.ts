import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await prisma.property.findFirst({
    where: { organization: { users: { some: { email: session.email } } } },
  });
  if (!property) return NextResponse.json([]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [invoices, lastMonthInvoices, confirmedBookings, weekBookings, overdueInvoices, allBookings] = await Promise.all([
    prisma.invoice.findMany({ where: { booking: { propertyId: property.id }, invoiceDate: { gte: monthStart } }, select: { totalAmount: true } }),
    prisma.invoice.findMany({ where: { booking: { propertyId: property.id }, invoiceDate: { gte: lastMonthStart, lt: monthStart } }, select: { totalAmount: true } }),
    prisma.booking.count({ where: { propertyId: property.id, status: { in: ["CONFIRMED", "IN_PROGRESS"] } } }),
    prisma.booking.count({ where: { propertyId: property.id, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.invoice.findMany({ where: { booking: { propertyId: property.id }, status: "OVERDUE" }, select: { amountDue: true } }),
    prisma.booking.findMany({ where: { propertyId: property.id, status: { in: ["CONFIRMED","COMPLETED","INVOICED"] } }, select: { quotedAmount: true } }),
  ]);

  const mtdRevenue = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
  const lastRevenue = lastMonthInvoices.reduce((s, i) => s + Number(i.totalAmount), 0);
  const revDelta = lastRevenue > 0 ? ((mtdRevenue - lastRevenue) / lastRevenue) * 100 : 0;
  const overdueTotal = overdueInvoices.reduce((s, i) => s + Number(i.amountDue), 0);
  const avgVal = allBookings.length ? allBookings.reduce((s, b) => s + Number(b.quotedAmount), 0) / allBookings.length : 0;

  return NextResponse.json([
    { label: "Revenue (MTD)", value: "₹" + mtdRevenue.toLocaleString("en-IN"), delta: `${revDelta >= 0 ? "+" : ""}${revDelta.toFixed(1)}% vs last month`, up: revDelta >= 0 },
    { label: "Confirmed Bookings", value: String(confirmedBookings), delta: `${weekBookings} this week`, up: true },
    { label: "Avg. Event Value", value: "₹" + Math.round(avgVal).toLocaleString("en-IN"), delta: "Based on confirmed bookings", up: true },
    { label: "Outstanding Dues", value: "₹" + overdueTotal.toLocaleString("en-IN"), delta: `${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? "s" : ""} overdue`, up: false },
  ]);
}
