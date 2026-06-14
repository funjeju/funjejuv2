/** 삼행시 — 유저용. GET 엔트리목록(+내가 좋아요한 것) / POST submit·edit·delete·like */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { resolveUser } from "@/lib/usage";
import {
  getTopic, listEntries, likedEntryIds, countUserEntries,
  addEntry, editEntry, deleteEntry, toggleLike,
} from "@/lib/acrostic";
import type { AcrosticEntry } from "@/types/acrostic";

export const runtime = "nodejs";

async function uid(req: NextRequest): Promise<string> {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  const u = await resolveUser(auth, req.headers.get("x-anon-id"));
  return u.userId;
}

export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get("topicId");
  if (!topicId) return NextResponse.json({ error: "topicId 필요" }, { status: 400 });
  const userId = await uid(req);
  const [entries, liked] = await Promise.all([listEntries(topicId), likedEntryIds(topicId, userId)]);
  const myCount = entries.filter((e) => e.userId === userId).length;
  return NextResponse.json({ entries, likedIds: liked, myEntryCount: myCount, userId });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    action?: "submit" | "edit" | "delete" | "like";
    topicId?: string; entryId?: string; lines?: string[]; authorName?: string;
  };
  const userId = await uid(req);

  if (b.action === "like") {
    if (!b.entryId) return NextResponse.json({ error: "entryId 필요" }, { status: 400 });
    const r = await toggleLike(b.entryId, userId);
    if (!r) return NextResponse.json({ error: "엔트리 없음" }, { status: 404 });
    return NextResponse.json({ ok: true, ...r });
  }

  if (b.action === "edit") {
    if (!b.entryId || !b.lines?.length) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    const ok = await editEntry(b.entryId, userId, b.lines.map((l) => l.trim()));
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "본인 엔트리만 수정 가능" }, { status: 403 });
  }

  if (b.action === "delete") {
    if (!b.entryId) return NextResponse.json({ error: "entryId 필요" }, { status: 400 });
    const ok = await deleteEntry(b.entryId, userId);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "본인 엔트리만 삭제 가능" }, { status: 403 });
  }

  // submit (기본)
  if (!b.topicId || !b.lines?.length) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  const topic = await getTopic(b.topicId);
  if (!topic || topic.status !== "published") return NextResponse.json({ error: "주제 없음" }, { status: 404 });
  if (topic.endsAt && Date.now() > topic.endsAt) return NextResponse.json({ error: "마감된 주제예요" }, { status: 400 });
  const lines = b.lines.map((l) => l.trim());
  if (lines.length !== topic.word.length || lines.some((l) => !l)) {
    return NextResponse.json({ error: `${topic.word.length}행을 모두 채워주세요` }, { status: 400 });
  }
  const used = await countUserEntries(b.topicId, userId);
  if (used >= topic.maxEntriesPerUser) {
    return NextResponse.json({ error: `이 주제는 1인 ${topic.maxEntriesPerUser}개까지예요 (수정만 가능)` }, { status: 400 });
  }
  const entry: AcrosticEntry = {
    id: crypto.randomUUID(),
    topicId: b.topicId,
    userId,
    authorName: (b.authorName ?? "").trim().slice(0, 20) || "익명",
    lines,
    likes: 0,
    createdAt: Date.now(),
  };
  await addEntry(entry);
  return NextResponse.json({ ok: true, id: entry.id });
}
