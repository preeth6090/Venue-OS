import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { invoiceId, invoiceNumber, reason, amount, cgstAmount, sgstAmount, totalAmount } = body;

  if (!invoiceId || !reason || !amount) {
    return NextResponse.json({ error: "invoiceId, reason and amount are required" }, { status: 400 });
  }

  const count = await prisma.creditNote.count();
  const creditNoteNumber = `CN-${invoiceNumber?.split("/").slice(-1)[0] ?? String(count + 1).padStart(4, "0")}`;

  const cn = await prisma.creditNote.create({
    data: {
      invoiceId,
      creditNoteNumber,
      creditNoteDate: new Date(),
      reason,
      amount,
      cgstAmount: cgstAmount ?? 0,
      sgstAmount: sgstAmount ?? 0,
      igstAmount: 0,
      totalAmount: totalAmount ?? amount,
    },
  });

  return NextResponse.json({ id: cn.id, creditNoteNumber: cn.creditNoteNumber }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");

  const where = invoiceId ? { invoiceId } : {};
  const notes = await prisma.creditNote.findMany({ where, orderBy: { createdAt: "desc" } });

  return NextResponse.json(notes.map(n => ({
    id: n.id,
    creditNoteNumber: n.creditNoteNumber,
    creditNoteDate: n.creditNoteDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    reason: n.reason,
    amount: Number(n.amount),
    cgstAmount: Number(n.cgstAmount),
    sgstAmount: Number(n.sgstAmount),
    totalAmount: Number(n.totalAmount),
  })));
}
