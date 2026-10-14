import { requireSite } from "@/core/auth";

/* Everything under /wholesale: only for people who can manage wholesale (404 for anyone else).
   The scope wrapper gives the whole section the site's accent colour. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSite("wholesale");
  return <div className="scope" data-site="wholesale">{children}</div>;
}
