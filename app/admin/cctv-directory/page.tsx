import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DirectoryAdmin } from "@/components/cctv/DirectoryAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "새 CCTV 목록 관리", robots: { index: false, follow: false } };
export default async function DirectoryAdminPage() {
  const secret = process.env.ADMIN_SECRET;
  const cookie = (await cookies()).get("admin_auth")?.value;
  if (!secret || !cookie || cookie !== secret) redirect("/admin/login?next=%2Fadmin%2Fcctv-directory");
  return <DirectoryAdmin catalogueHref={null} />;
}
