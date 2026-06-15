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

  const tasks = await prisma.task.findMany({
    where: { propertyId: property?.id ?? undefined },
    orderBy: [{ createdAt: "desc" }],
  });

  const now = new Date();
  return NextResponse.json(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedTo: t.assignedTo,
      priority: t.priority,
      deadline: t.deadline ? t.deadline.toISOString().split("T")[0] : null,
      status: t.status,
      category: t.category,
      relatedRef: t.relatedRef,
      source: t.source,
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
      isOverdue: t.deadline ? now > t.deadline && t.status !== "COMPLETED" : false,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const property = await getProperty(session.email);

  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      assignedTo: body.assignedTo ?? null,
      priority: body.priority ?? "NORMAL",
      deadline: body.deadline ? new Date(body.deadline) : null,
      status: body.status ?? "PENDING",
      category: body.category ?? "GENERAL",
      relatedRef: body.relatedRef ?? null,
      source: body.source ?? "MANUAL",
      notes: body.notes ?? null,
      propertyId: property?.id ?? null,
    },
  });

  return NextResponse.json({ id: task.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.deadline !== undefined && { deadline: data.deadline ? new Date(data.deadline) : null }),
    },
  });

  return NextResponse.json({ id: task.id });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
