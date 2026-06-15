import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "venueos-fallback-secret");

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
}

export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get("vos-session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
