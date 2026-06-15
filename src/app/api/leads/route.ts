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

  const leads = await prisma.lead.findMany({
    where: { propertyId: property.id },
    include: { client: { select: { displayName: true } }, assignedBde: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads.map(l => ({
    id: l.id,
    name: l.client?.displayName || l.contactName || "Unknown",
    event: l.eventType?.replace(/_/g, " ") ?? "—",
    date: l.tentativeDate?.toLocaleDateString("en-IN", { month:"short", year:"numeric" }) ?? "—",
    budget: l.budgetMin && l.budgetMax ? `₹${Math.round(Number(l.budgetMin)/1000)}K–₹${Math.round(Number(l.budgetMax)/1000)}K` : "—",
    status: l.status,
    bde: l.assignedBde ? `${l.assignedBde.firstName} ${l.assignedBde.lastName.charAt(0)}.` : "—",
  })));
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const property = await getProperty(session.email);
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let client = await prisma.client.findFirst({ where: { displayName: body.name } });
  if (!client) client = await prisma.client.create({ data: { legalName: body.name, displayName: body.name, clientType: "Individual", stateCode: "29", stateName: "Karnataka" } });

  const lead = await prisma.lead.create({
    data: { propertyId: property.id, clientId: client.id, contactName: body.name, eventType: (body.event?.toUpperCase().replace(/ /g,"_")||"OTHER") as any, tentativeDate: body.date?new Date(body.date):null, budgetMin: body.budgetMin||null, budgetMax: body.budgetMax||null, status: (body.status||"NEW") as any, source: "DIRECT" as any },
    include: { client: true },
  });

  return NextResponse.json({ id: lead.id, name: lead.client?.displayName||lead.contactName, event: lead.eventType?.replace(/_/g," ")??"—", date: lead.tentativeDate?.toLocaleDateString("en-IN",{month:"short",year:"numeric"})??"—", budget: "—", status: lead.status, bde: "—" }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  const lead = await prisma.lead.update({ where: { id }, data: { status } });
  return NextResponse.json({ status: lead.status });
}
