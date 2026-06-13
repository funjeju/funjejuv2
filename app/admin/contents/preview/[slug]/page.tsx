import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getContentBySlug } from "@/lib/contents";
import { BriefingArticle } from "@/components/daily/BriefingArticle";
import { DeployBar } from "@/components/daily/DeployBar";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export default async function BriefingPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!(await isAdmin())) notFound();
  const { slug } = await params;
  const c = await getContentBySlug(slug);
  if (!c) notFound();

  const content = JSON.parse(JSON.stringify(c));

  return (
    <article className="mx-auto max-w-3xl px-0 pb-24 md:px-4 md:py-6">
      <div className="mb-3 flex items-center gap-2 px-4 md:px-0">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700">
          👁 미리보기 {content.status === "published" ? "(발행됨)" : "(초안 — 아직 비공개)"}
        </span>
      </div>
      <BriefingArticle content={content} />
      <DeployBar id={content.id} slug={content.slug} published={content.status === "published"} />
    </article>
  );
}
