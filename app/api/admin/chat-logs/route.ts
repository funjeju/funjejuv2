import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "100"), 500);

  try {
    const db = getAdminDb();
    const snap = await db
      .collection("admin_chat_logs")
      .orderBy("archivedAt", "desc")
      .limit(limit)
      .get();

    const logs = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = d.data();
      return {
        id: d.id,
        cctvId: data.cctvId ?? "",
        cctvName: data.cctvName ?? "",
        periodKey: data.periodKey ?? "",
        messageCount: data.messageCount ?? 0,
        text: data.text ?? "",
        archivedAt: data.archivedAt?.toDate?.().toISOString() ?? "",
      };
    });

    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
