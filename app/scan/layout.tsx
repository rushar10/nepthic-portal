import { requireAdmin } from "@/core/auth";
import { can } from "@/core/perms";
import { notFound } from "next/navigation";
import { logout } from "@/app/login/actions";
import { ScanSW } from "./ScanSW";

export const metadata = { title: "Scanner", manifest: "/scan-manifest.webmanifest" };
export const dynamic = "force-dynamic";

/* The Events ticket scanner. The only screen Door / scanner staff can open; Events admins and
   staff can use it too. Always dark: door teams use it in dim venues. */
export default async function ScanLayout({ children }: { children: React.ReactNode }) {
  const a = await requireAdmin({ allowDoor: true });
  if (!can(a, "events", "door")) notFound();
  return (
    <div className="scope" data-site="events" data-theme="dark">
      <header className="adm-top" style={{ flexWrap: "nowrap" }}>
        <a className="adm-logo" href="/scan"><span className="mark" aria-hidden="true">N</span><span>NEPTHIC</span><span className="tag">SCANNER</span></a>
        <div className="adm-actions" style={{ marginLeft: "auto" }}>
          {a.role !== "DOOR" && <a className="btn btn-sm" href="/events/checkin">Portal</a>}
          <form action={logout}><button className="btn btn-sm" type="submit">Sign out</button></form>
        </div>
      </header>
      <main className="wrap" style={{ paddingBlock: 16 }}>{children}</main>
      <ScanSW />
    </div>
  );
}
