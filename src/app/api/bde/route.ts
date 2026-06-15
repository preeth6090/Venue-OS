import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await prisma.property.findFirst({ where: { organization: { users: { some: { email: session.email } } } } });
  if (!property) return NextResponse.json([]);

  const bdeUsers = await prisma.user.findMany({ where: { organizationId: property.organizationId, role: { in: ["BDE","SALES_MANAGER"] }, isActive: true } });

  const result = await Promise.all(bdeUsers.map(async u => {
    const bookings = await prisma.booking.findMany({ where: { propertyId: property.id, bdeId: u.id, status: { in: ["CONFIRMED","COMPLETED","INVOICED"] } }, select: { quotedAmount: true } });
    const revenue = bookings.reduce((s, b) => s + Number(b.quotedAmount), 0);
    return { id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role==="SALES_MANAGER"?"Sales Manager":"Business Dev. Exec.", bookings: bookings.length, revenue, commission: Math.round(revenue*0.02), target: u.role==="SALES_MANAGER"?1200000:1000000, rate: 2.0 };
  }));

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, target, rate } = await req.json();
  return NextResponse.json({ id, target, rate });
}
