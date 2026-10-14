import { Submit } from "@/ui/Forms";
import { OpForm } from "@/components/OpForm";

type E = { id: string; name: string; slug: string; description: string; venue: string; address: string; city: string; startsAt: string; ageRestriction: string; hue: number; status: "DRAFT" | "PUBLISHED" | "CANCELLED" };

/* Event times are entered and shown in Brisbane time (UTC+10, no daylight saving). */
const toLocalInput = (iso: string) => new Date(new Date(iso).getTime() + 10 * 3600e3).toISOString().slice(0, 16);

export function EventForm({ event, confirmed }: { event?: E; confirmed: boolean }) {
  return (
    <OpForm op="events:event.save" path={event ? `/events/events/${event.id}` : "/events/events"} redirectTo={event ? undefined : "/events/events/{id}?created=1"}
      className="panel prox" confirm={event ? "needed only to cancel the event" : undefined} confirmed={confirmed}>
      {event && <input type="hidden" name="id" value={event.id} />}
      <div className="form-grid">
        <label className="f">Event name<input type="text" name="name" defaultValue={event?.name} required /></label>
        <label className="f">Link (events.nepthic.com/e/…)<input type="text" name="slug" defaultValue={event?.slug} placeholder="auto from name" /></label>
        <label className="f">Date and doors (Brisbane time)<input type="datetime-local" name="startsAt" defaultValue={event ? toLocalInput(event.startsAt) : ""} required /></label>
        <label className="f">Status
          <select name="status" defaultValue={event?.status ?? "DRAFT"}>
            <option value="DRAFT">Draft (hidden)</option><option value="PUBLISHED">Published (on sale)</option><option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <label className="f">Venue<input type="text" name="venue" defaultValue={event?.venue} required /></label>
        <label className="f">Street address<input type="text" name="address" defaultValue={event?.address} /></label>
        <label className="f">Suburb, city<input type="text" name="city" defaultValue={event?.city} required /></label>
        <label className="f">Entry<input type="text" name="ageRestriction" defaultValue={event?.ageRestriction ?? "18+"} /></label>
        <label className="f full">Description<textarea name="description" defaultValue={event?.description} /></label>
        <label className="f">Poster colour (0–359, used without a cover image)<input type="number" name="hue" min={0} max={359} defaultValue={event?.hue ?? 265} /></label>
        <label className="f">Cover image<input type="file" name="cover" accept="image/jpeg,image/png,image/webp" /></label>
        <label className="f full">Add gallery photos<input type="file" name="gallery" accept="image/jpeg,image/png,image/webp" multiple /></label>
      </div>
      {!event && (
        <>
          <h2 className="h3">Ticket types and capacity</h2>
          <div className="scroll"><table className="tbl">
            <thead><tr><th>Name</th><th>Price ($ inc GST)</th><th>Capacity</th></tr></thead>
            <tbody>
              {[["General admission", "45", "500"], ["VIP", "95", "60"], ["", "", ""], ["", "", ""]].map(([n, p, c], i) => (
                <tr key={i}>
                  <td><input type="text" name={`types[${i}][name]`} defaultValue={n} aria-label={`Ticket type ${i + 1} name`} /></td>
                  <td><input type="number" name={`types[${i}][price]`} step="0.01" min="0" defaultValue={p} aria-label={`Ticket type ${i + 1} price`} /></td>
                  <td><input type="number" name={`types[${i}][capacity]`} min="0" defaultValue={c} aria-label={`Ticket type ${i + 1} capacity`} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
      <Submit pendingText="Saving…">{event ? "Save changes" : "Create event"}</Submit>
    </OpForm>
  );
}
