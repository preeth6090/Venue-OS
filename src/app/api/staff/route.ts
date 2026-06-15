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

  const staff = await prisma.propertyStaff.findMany({ where: { propertyId: property.id, isActive: true }, orderBy: { createdAt: "asc" } });
  const catIdx: Record<string, number> = {};
  return NextResponse.json(staff.map(s => {
    const cat = s.category || "maintenance";
    catIdx[cat] = (catIdx[cat] || 0) + 1;
    return {
      id: `${cat.slice(0,3).toUpperCase()}-${String(catIdx[cat]).padStart(3,"0")}`,
      dbId: s.id, name: `${s.firstName} ${s.lastName}`, category: cat,
      role: s.staffRole.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()),
      shift: s.shift || "Morning (6am–2pm)", phone: s.phone,
      joining: s.joiningDate?.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) ?? "—",
      bgv: s.bgCheckStatus, vendor: s.vendorName || "Direct Hire",
      aadhaar: s.aadhaarRef || "XXXX-0000", police: s.policeVerified,
      cert: s.bgvAgencyName || "—",
      certExp: s.bgvExpiresAt?.toLocaleDateString("en-IN",{month:"short",year:"numeric"}) ?? "—",
      photo: s.photoUrl || "", notes: s.notes || "",
    };
  }));
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const property = await getProperty(session.email);
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const roleMap: Record<string,string> = { security:"SECURITY_GUARD", housekeeping:"HOUSEKEEPING_STAFF", maintenance:"EVENT_COORDINATOR", electrical:"EVENT_COORDINATOR", caretaker:"FRONT_DESK", av:"EVENT_COORDINATOR", plumber:"EVENT_COORDINATOR", gardener:"EVENT_COORDINATOR" };
  const nameParts = body.name.split(" ");
  const s = await prisma.propertyStaff.create({ data: { propertyId: property.id, firstName: nameParts[0]||body.name, lastName: nameParts.slice(1).join(" ")||"", staffRole: (roleMap[body.category]||"EVENT_COORDINATOR") as any, category: body.category, shift: body.shift, vendorName: body.vendor==="Direct Hire"?null:body.vendor, phone: body.phone, aadhaarRef: body.aadhaar, policeVerified: body.police||false, bgCheckStatus: (body.bgv||"NOT_INITIATED") as any, bgvAgencyName: body.cert||null, photoUrl: body.photo||null, joiningDate: body.joining?new Date(body.joining):null, notes: body.notes||null } });
  return NextResponse.json({ dbId: s.id, ...body }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dbId, ...data } = await req.json();
  if (!dbId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const nameParts = (data.name||"").split(" ");
  await prisma.propertyStaff.update({ where: { id: dbId }, data: { firstName: nameParts[0]||"", lastName: nameParts.slice(1).join(" ")||"", category: data.category, shift: data.shift, vendorName: data.vendor==="Direct Hire"?null:data.vendor, phone: data.phone, aadhaarRef: data.aadhaar, policeVerified: data.police||false, bgCheckStatus: (data.bgv||"NOT_INITIATED") as any, bgvAgencyName: data.cert||null, photoUrl: data.photo||null, notes: data.notes||null } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dbId } = await req.json();
  await prisma.propertyStaff.update({ where: { id: dbId }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
