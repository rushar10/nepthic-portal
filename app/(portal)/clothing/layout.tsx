import { requireSite } from "@/core/auth";

/* Everything under /clothing: only for people who can manage clothing (404 for anyone else).
   The scope wrapper gives the whole section the site's accent colour. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSite("clothing");
  return <div className="scope" data-site="clothing">{children}</div>;
}
