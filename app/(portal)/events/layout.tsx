import { requireSite } from "@/core/auth";

/* Everything under /events: only for people who can manage events (404 for anyone else).
   The scope wrapper gives the whole section the site's accent colour. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSite("events");
  return <div className="scope" data-site="events">{children}</div>;
}
