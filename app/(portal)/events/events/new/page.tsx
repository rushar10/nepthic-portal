import Link from "next/link";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { SectionHead } from "@/components/Section";
import { callSite } from "@/core/ops";
import { EventForm, type TemplateOption } from "../EventForm";

export const metadata = { title: "New event" };

export default async function NewEvent() {
  const a = await requireSite("events", "manage");
  const tpl = await callSite<{ templates: TemplateOption[] }>(a, "events", "templates.list", {}, { level: "manage" });
  return (
    <>
      <Link className="btn btn-ghost btn-sm" href="/events/events" style={{ justifySelf: "start" }}>← Events</Link>
      <SectionHead site="events" title="New event" livePath={null} sub="Save as a draft first if you're not ready to sell. Publishing puts it on the Events site straight away." />
      <EventForm confirmed={recentlyConfirmed(a)} templates={tpl.ok ? tpl.data.templates : []} />
    </>
  );
}
