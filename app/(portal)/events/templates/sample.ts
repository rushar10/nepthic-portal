import QRCode from "qrcode";
import { SAMPLE_DATA } from "@/core/ticket-design";

/** A real, scannable QR for the editor preview (it encodes the sample code, which no door admits). */
export const sampleQr = () => QRCode.toDataURL(`NEPTHIC-SAMPLE:${SAMPLE_DATA.code}`, { margin: 1, width: 480, errorCorrectionLevel: "M", color: { dark: "#0F172A", light: "#FFFFFF" } });

/** The same sample QR as a module matrix, for the printed-ticket preview (vector QR). */
export function sampleMatrix(): boolean[][] {
  const q = QRCode.create(`NEPTHIC-SAMPLE:${SAMPLE_DATA.code}`, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => !!q.modules.data[r * n + c]));
}
