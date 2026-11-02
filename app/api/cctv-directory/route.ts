import { NextResponse } from "next/server";
import { listDirectory } from "@/lib/cctv-directory-server";
import { projectPublicDirectoryEntry } from "@/lib/cctv-directory";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const {entries}=await listDirectory();
    return NextResponse.json({entries:entries.filter(entry=>entry.visible).map(projectPublicDirectoryEntry)},{headers:{"Cache-Control":"public, s-maxage=30, max-age=0"}});
  } catch {
    return NextResponse.json({error:"Directory temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
