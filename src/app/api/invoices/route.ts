import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function getProperty(email: string) {
  return prisma.property.findFirst({ where: { organization: { users: { some: { email } } } } });
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const property = await getProperty(session.email);
  if (!property) return NextResponse.json([]);

  const invoices = await prisma.invoice.findMany({
    where: { booking: { propertyId: property.id } },
    include: { client: { select: { displayName: true } }, booking: { select: { bookingRef: true } }, lineItems: true },
    orderBy: { invoiceDate: "desc" },
  });

  return NextResponse.json(invoices.map(inv => ({
    id: inv.id, num: inv.invoiceNumber, client: inv.client.displayName,
    taxable: Number(inv.taxableAmount), cgst: Number(inv.cgstAmount), sgst: Number(inv.sgstAmount),
    total: Number(inv.totalAmount),
    due: inv.dueDate.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),
    status: inv.status, bookingRef: inv.booking.bookingRef,
    items: inv.lineItems.map(li => ({ desc: li.description, sac: li.sacCode, qty: Number(li.quantity), rate: Number(li.unitRate) })),
  })));
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const property = await getProperty(session.email);
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { email: session.email } });
  const booking = await prisma.booking.findUnique({ where: { bookingRef: body.bookingRef } });
  const client = await prisma.client.findFirst({ where: { displayName: body.client } });
  const legalEntity = await prisma.legalEntity.findFirst({ where: { organizationId: property.organizationId } });
  if (!user || !booking || !client || !legalEntity) return NextResponse.json({ error: "Missing references" }, { status: 404 });

  const taxable = body.items.reduce((s: number, i: any) => s + i.qty * i.rate, 0);
  const cgst = Math.round(taxable * 0.09);
  const sgst = Math.round(taxable * 0.09);
  const total = taxable + cgst + sgst;

  const inv = await prisma.invoice.create({
    data: {
      legalEntityId: legalEntity.id, bookingId: booking.id, clientId: client.id, createdById: user.id,
      invoiceNumber: body.num, invoiceDate: new Date(), dueDate: new Date(body.due||Date.now()+15*86400000),
      status: "SENT" as any, supplyType: "INTRA" as any, placeOfSupply: "29",
      subtotal: taxable, taxableAmount: taxable, cgstAmount: cgst, sgstAmount: sgst,
      totalAmount: total, amountPaid: 0, amountDue: total,
      lineItems: { create: body.items.map((it: any, i: number) => ({ description: it.desc, sacCode: it.sac, quantity: it.qty, unit: "lump sum", unitRate: it.rate, amount: it.qty*it.rate, taxableAmount: it.qty*it.rate, gstRatePercent: 18, cgstRate: 9, sgstRate: 9, cgstAmount: Math.round(it.qty*it.rate*0.09), sgstAmount: Math.round(it.qty*it.rate*0.09), lineTotal: Math.round(it.qty*it.rate*1.18), displayOrder: i })) },
    },
    include: { client: true, booking: true, lineItems: true },
  });

  return NextResponse.json({ id: inv.id, num: inv.invoiceNumber, client: inv.client.displayName, taxable: Number(inv.taxableAmount), cgst: Number(inv.cgstAmount), sgst: Number(inv.sgstAmount), total: Number(inv.totalAmount), due: inv.dueDate.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}), status: "SENT", bookingRef: inv.booking.bookingRef, items: inv.lineItems.map(li=>({desc:li.description,sac:li.sacCode,qty:Number(li.quantity),rate:Number(li.unitRate)})) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.invoiceNumber) data.invoiceNumber = body.invoiceNumber;
  if (body.status === "PAID") {
    const inv = await prisma.invoice.findUnique({ where: { id }, select: { totalAmount: true } });
    data.status = "PAID";
    data.amountPaid = inv?.totalAmount ?? 0;
    data.amountDue = 0;
  }

  const inv = await prisma.invoice.update({ where: { id }, data });
  return NextResponse.json({ num: inv.invoiceNumber, status: inv.status });
}
