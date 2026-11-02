import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listDirectory, importLegacyDirectory, saveDirectory } from "@/lib/cctv-directory-server";
import { DirectoryError } from "@/lib/cctv-directory";
import type { DirectorySaveRequest } from "@/types/cctv-directory";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const writesEnabled = () => process.env.CCTV_DIRECTORY_WRITES_ENABLED === "true";
const MAX_BODY = 24 * 1024;
const reply = (body: unknown, status = 200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function authenticated() {
  const secret = process.env.ADMIN_SECRET;
  return !!secret && (await cookies()).get("admin_auth")?.value === secret;
}
const failure = (e: unknown) => e instanceof DirectoryError ? reply({error:e.message},e.status) : reply({error:"Directory temporarily unavailable."},503);
export async function GET() {
  if (!await authenticated()) return reply({error:"Unauthorized"},401);
  try { return reply({ ...await listDirectory(), writesEnabled: writesEnabled() }); } catch(e) { return failure(e); }
}
async function boundedJson(req: NextRequest): Promise<Record<string,unknown>> {
  if (!/^application\/json(?:\s*;.*)?$/i.test(req.headers.get("content-type") ?? "")) throw new DirectoryError(400);
  const length = req.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length)>MAX_BODY)) throw new DirectoryError(400);
  const reader = req.body?.getReader();
  if (!reader) throw new DirectoryError(400);
  const chunks: Uint8Array[]=[];let total=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BODY){await reader.cancel();throw new DirectoryError(400);}chunks.push(value);}
    const bytes = new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
    const data:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
    if(!data||typeof data!=="object"||Array.isArray(data))throw new DirectoryError(400);
    return data as Record<string,unknown>;
  } catch(e) { if(e instanceof DirectoryError)throw e;throw new DirectoryError(400); }
  finally { reader.releaseLock(); }
}
export async function POST(req: NextRequest) {
  if (!await authenticated()) return reply({error:"Unauthorized"},401);
  if (req.headers.get("origin") !== req.nextUrl.origin) return reply({error:"Forbidden"},403);
  if (!writesEnabled()) return reply({error:"Directory writes are locked pending access-rule verification."},503);
  try {
    const body = await boundedJson(req);
    if(body.action === "import-legacy") {
      if(Object.keys(body).some(k=>!["action","expectedImportRevision"].includes(k))||typeof body.expectedImportRevision!=="string")throw new DirectoryError(400);
      return reply(await importLegacyDirectory(body.expectedImportRevision));
    }
    if(body.action === "save") {
      if(Object.keys(body).some(k=>!["action","id","expectedRevision","fields","observation"].includes(k)))throw new DirectoryError(400);
      return reply({entry:await saveDirectory(body as unknown as DirectorySaveRequest)});
    }
    throw new DirectoryError(400);
  } catch(e) { return failure(e); }
}
