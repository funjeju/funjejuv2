import { NextResponse } from "next/server";
export const dynamic = "force-static";
function disabled() { return NextResponse.json({ error: "이 기능은 운영을 중단했습니다." }, { status: 410 }); }
export { disabled as GET, disabled as POST, disabled as PUT, disabled as PATCH, disabled as DELETE };
