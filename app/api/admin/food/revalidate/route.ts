import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateFoodPages } from "@/lib/food-cache";

export const runtime = "nodejs";

/**
 * The food admin UI currently writes directly to Firestore from the browser.
 * Keep cache invalidation on the server, where the admin cookie can be checked.
 */
async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
  revalidateFoodPages(typeof id === "string" ? id : undefined);
  return NextResponse.json({ ok: true });
}
