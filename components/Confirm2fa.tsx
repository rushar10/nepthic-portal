import { env } from "@/core/env";
import { ConfirmField } from "./ConfirmField";

/** The "confirm it's you" field on sensitive actions: the 2FA code, or the password while 2FA is
    switched off (PORTAL_REQUIRE_2FA=false). Once confirmed, the next 5 minutes don't ask again. */
export function Confirm2fa({ note, confirmed }: { note: string; confirmed: boolean }) {
  return <ConfirmField note={note} confirmed={confirmed} twoFactor={env.require2fa} />;
}
