import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const OVERHEAD_CATS = [
  { name: "Electricity & Utilities", icon: "⚡", amount: 45000,  color: "#f59e0b", key: "electricity" },
  { name: "Property Rent",           icon: "🏢", amount: 120000, color: "#3b82f6", key: "rent"        },
  { name: "Security Staff",          icon: "🛡️", amount: 38000,  color: "#ef4444", key: "security"    },
  { name: "Housekeeping & Cleaning", icon: "🧹", amount: 25000,  color: "#10b981", key: "housekeeping" },
  { name: "Catering Setup",          icon: "🍽️", amount: 15000,  color: "#a855f7", key: "catering"    },
  { name: "AV & Technology",         icon: "📺", amount: 12000,  color: "#06b6d4", key: "av"          },
  { name: "Maintenance & Repairs",   icon: "🔧", amount: 8000,   color: "#f97316", key: "maintenance" },
  { name: "Miscellaneous",           icon: "📦", amount: 10000,  color: "#64748b", key: "misc"        },
];

const STATIC_MONTHLY = [
  { month: "Jan", electricity: 42000, rent: 120000, security: 36000, housekeeping: 23000, catering: 12000, av: 9000,  maintenance: 6000,  misc: 8000  },
  { month: "Feb", electricity: 38000, rent: 120000, security: 36000, housekeeping: 22000, catering: 14000, av: 11000, maintenance: 7000,  misc: 9000  },
  { month: "Mar", electricity: 41000, rent: 120000, security: 37000, housekeeping: 24000, catering: 18000, av: 15000, maintenance: 12000, misc: 11000 },
  { month: "Apr", electricity: 44000, rent: 120000, security: 38000, housekeeping: 25000, catering: 15000, av: 12000, maintenance: 8000,  misc: 10000 },
  { month: "May", electricity: 47000, rent: 120000, security: 38000, housekeeping: 26000, catering: 16000, av: 13000, maintenance: 9000,  misc: 12000 },
  { month: "Jun", electricity: 45000, rent: 120000, security: 38000, housekeeping: 25000, catering: 15000, av: 12000, maintenance: 8000,  misc: 10000 },
];

const CAT_MAP: Record<string, string> = {
  CATERING: "catering", AV_SETUP: "av", HOUSEKEEPING: "housekeeping",
  SECURITY: "security", REPAIRS_MAINTENANCE: "maintenance", CONSUMABLES: "misc",
  STAFF_OVERTIME: "misc", VENDOR_PAYMENT: "misc", LOGISTICS: "misc", OTHER: "misc",
};

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const property = await prisma.property.findFirst({
      where: { organization: { users: { some: { email: session.email } } } },
    });
    if (!property) return NextResponse.json({ categories: OVERHEAD_CATS, monthly: STATIC_MONTHLY });

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const expenses = await prisma.expense.findMany({
      where: { booking: { propertyId: property.id }, expenseDate: { gte: sixMonthsAgo } },
      select: { category: true, amount: true, expenseDate: true },
    });

    if (expenses.length === 0) {
      return NextResponse.json({ categories: OVERHEAD_CATS, monthly: STATIC_MONTHLY });
    }

    // Build monthly breakdown from DB expenses
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyMap: Record<string, Record<string,number>> = {};
    for (const exp of expenses) {
      const key = monthNames[exp.expenseDate.getMonth()];
      if (!monthlyMap[key]) monthlyMap[key] = { electricity:0, rent:0, security:0, housekeeping:0, catering:0, av:0, maintenance:0, misc:0 };
      const cat = CAT_MAP[exp.category] ?? "misc";
      monthlyMap[key][cat] = (monthlyMap[key][cat] ?? 0) + Number(exp.amount);
    }

    const monthly = Object.entries(monthlyMap).map(([month, vals]) => ({ month, ...vals }));

    // Category totals from current month
    const currKey = monthNames[now.getMonth()];
    const curr = monthlyMap[currKey] ?? monthlyMap[Object.keys(monthlyMap).at(-1) ?? ""] ?? {};
    const categories = OVERHEAD_CATS.map(c => ({ ...c, amount: (curr as any)[c.key] ?? c.amount }));

    return NextResponse.json({ categories, monthly: monthly.length ? monthly : STATIC_MONTHLY });
  } catch {
    return NextResponse.json({ categories: OVERHEAD_CATS, monthly: STATIC_MONTHLY });
  }
}
