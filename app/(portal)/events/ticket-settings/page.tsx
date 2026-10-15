import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";
import { can } from "@/core/perms";
import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";
import { SectionHead } from "@/components/Section";
import { SiteProblem } from "@/components/SiteProblem";
import { EventPicker, sortEvents } from "@/components/EventPicker";
import type { CodeFormat } from "@/core/ticket-code-format";
import { CodeSettings } from "./CodeSettings";

export const metadata = { title: "Ticket settings" };

type D = {
  event: { id: string; name: string; slug: string; startsAt: string; ticketFormats: string[]; gates: string[] };
  format: CodeFormat; issued: number;
  types: { id: string; name: string; codePrefix: string; fallback: string; zone: string }[];
  partners: { id: string; name: string; code: string }[];
  ranges: { partner: string; type: string; start: number; end: number }[];
  counters: { key: string; next: number }[];
};

/* Per-event ticket code format, checkout formats and scanner gates. */
export default async function TicketSettings({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const a = await requireSite("events");
  if (!can(a, "events", "manage")) notFound();
  const { event } = await searchParams;
  const evs = await callSite<{ events: { id: string; name: string; startsAt: string }[] }>(a, "events", "events.list");
  const list = evs.ok ? sortEvents(evs.data.events) : [];
  const current = event ?? list[0]?.id;
  const r = current ? await callSite<D>(a, "events", "codes.get", { eventId: current }) : null;
  const head = <SectionHead site="events" title="Ticket settings" livePath={null} sub="The readable code printed under each QR and typed at the door if a QR is damaged, plus the formats offered at checkout and the gates in the scanner." />;
  if (!evs.ok) return <>{head}<SiteProblem site="events" r={evs} /></>;
  if (!r) return <>{head}<div className="empty">No events yet.</div></>;
  if (!r.ok) return <>{head}<EventPicker events={list} current={current} path="/events/ticket-settings" /><SiteProblem site="events" r={r} /></>;
  const d = r.data;
  const q = QRCode.create("NEPTHIC-SAMPLE:PREVIEW", { errorCorrectionLevel: "M" });
  const qr = Array.from({ length: q.modules.size }, (_, i) => Array.from({ length: q.modules.size }, (_, j) => !!q.modules.data[i * q.modules.size + j]));
  return (
    <>
      {head}
      <EventPicker events={list} current={current} path="/events/ticket-settings" />
      <OpForm op="events:codes.save" path={`/events/ticket-settings?event=${d.event.id}`} className="panel prox">
        <input type="hidden" name="eventId" value={d.event.id} />
        <CodeSettings key={d.event.id} initial={d.format} types={d.types} partners={d.partners} counters={d.counters} ranges={d.ranges} issued={d.issued}
          eventDate={d.event.startsAt} formats={d.event.ticketFormats} gates={d.event.gates} qr={qr} />
        <Submit pendingText="Saving…">Save ticket settings for {d.event.name}</Submit>
      </OpForm>
    </>
  );
}
