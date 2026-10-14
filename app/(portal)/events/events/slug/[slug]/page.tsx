import { notFound, redirect } from "next/navigation";
import { requireSite } from "@/core/auth";
import { callSite } from "@/core/ops";

/* "Edit this event" from the admin preview bar links here with the event's public link name. */
export default async function BySlug({ params }: { params: Promise<{ slug: string }> }) {
  const a = await requireSite("events");
  const r = await callSite<{ id: string }>(a, "events", "event.bySlug", { slug: (await params).slug });
  if (!r.ok) notFound();
  redirect(`/events/events/${r.data.id}`);
}
