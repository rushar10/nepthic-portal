import { notFound } from "next/navigation";
import { requireAdmin } from "@/core/auth";
import { logout } from "@/app/login/actions";
import { AppShell } from "@/ui/ux/AppShell";

export const metadata = { title: "Partner" };
export const dynamic = "force-dynamic";

/* An Events partner's own page: their allocations, sales and scans only. Partner accounts can't
   open anything else in the portal, and Events checks the partner code on every request. */
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const a = await requireAdmin({ allowPartner: true });
  if (a.role !== "PARTNER") notFound();
  return (
    <AppShell>
      <div className="scope" data-site="events">
        <header className="adm-top" style={{ flexWrap: "nowrap" }}>
          <a className="adm-logo" href="/partner"><span className="mark" aria-hidden="true">N</span><span>NEPTHIC</span><span className="tag">PARTNER</span></a>
          <div className="adm-actions" style={{ marginLeft: "auto" }}>
            <span className="small dim">{a.name}</span>
            <form action={logout}><button className="btn btn-sm" type="submit">Sign out</button></form>
          </div>
        </header>
        <main className="wrap stack" style={{ paddingBlock: 16 }} id="main">{children}</main>
      </div>
    </AppShell>
  );
}
