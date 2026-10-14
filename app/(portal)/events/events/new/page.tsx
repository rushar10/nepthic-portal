import Link from "next/link";
import { recentlyConfirmed, requireSite } from "@/core/auth";
import { SectionHead } from "@/components/Section";
import { EventForm } from "../EventForm";

export const metadata = { title: "New event" };

export default async function NewEvent() {
  const a = await requireSite("events", "manage");
  return (
    <>
      <Link className="btn btn-ghost btn-sm" href="/events/events" style={{ justifySelf: "start" }}>← Events</Link>
      <SectionHead site="events" title="New event" livePath={null} sub="Save as a draft first if you're not ready to sell. Publishing puts it on the Events site straight away." />
      <EventForm confirmed={recentlyConfirmed(a)} />
    </>
  );
}
