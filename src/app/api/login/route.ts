import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Demo users — credentials are shown publicly on the login page
const DEMO_USERS = [
  { email: "admin@grandpalace.in",   password: "admin123",   role: "SUPER_ADMIN",   name: "Arjun Mehta"  },
  { email: "sales@grandpalace.in",   password: "sales123",   role: "SALES_MANAGER", name: "Sneha Reddy"  },
  { email: "bde@grandpalace.in",     password: "bde123",     role: "BDE",           name: "Karan Mehta"  },
  { email: "ops@grandpalace.in",     password: "ops123",     role: "OPERATIONS",    name: "Vinod Sharma" },
  { email: "finance@grandpalace.in", password: "finance123", role: "FINANCE",       name: "Meena Joshi"  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").toLowerCase().trim();
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Check demo credentials directly — no DB needed for auth
    const demo = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (!demo) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Get real DB user ID if available (non-blocking)
    let userId = "demo-" + demo.role.toLowerCase();
    let orgId  = "demo-org";
    try {
      const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true, organizationId: true } });
      if (dbUser) { userId = dbUser.id; orgId = dbUser.organizationId; }
    } catch {
      // DB unavailable — use placeholder IDs, data APIs will show demo data
    }

    const token = await createSessionToken({
      id: userId,
      email: demo.email,
      name: demo.name,
      role: demo.role,
      organizationId: orgId,
    });

    const res = NextResponse.json({ ok: true, user: { email: demo.email, name: demo.name, role: demo.role } });
    res.cookies.set("vos-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[login] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
