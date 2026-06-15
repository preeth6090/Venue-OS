import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await prisma.property.findFirst({ where: { organization: { users: { some: { email: session.email } } } }, include: { legalEntity: true } });
  if (!property) return NextResponse.json(null);

  const portal = (property.venuePortalConfig as any) || {};
  return NextResponse.json({ name: property.name, tagline: portal.tagline||"", description: portal.description||"", addressLine1: property.addressLine1, city: property.city, state: property.state, pincode: property.pincode, phone: property.phone||"", email: property.email||"", website: property.websiteUrl||"", gstin: property.legalEntity?.gstin||"", logoUrl: portal.logoUrl||"", coverPhotoUrl: property.coverImageUrl||"", promoVideoUrl: portal.promoVideoUrl||"", gallery: portal.gallery||[], facilities: portal.facilities||[], spaces: portal.spaces||[], instagram: portal.instagram||"", facebook: portal.facebook||"", googleMapsUrl: portal.googleMapsUrl||"" });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const property = await prisma.property.findFirst({ where: { organization: { users: { some: { email: session.email } } } } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.property.update({ where: { id: property.id }, data: { name: body.name, addressLine1: body.addressLine1, city: body.city, state: body.state, pincode: body.pincode, phone: body.phone, email: body.email, websiteUrl: body.website, coverImageUrl: body.coverPhotoUrl, venuePortalConfig: { tagline: body.tagline, description: body.description, promoVideoUrl: body.promoVideoUrl, gallery: body.gallery, facilities: body.facilities, spaces: body.spaces, instagram: body.instagram, facebook: body.facebook, googleMapsUrl: body.googleMapsUrl, logoUrl: body.logoUrl } } });
  return NextResponse.json({ ok: true });
}
