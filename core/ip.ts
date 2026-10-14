/** IPv4 address or CIDR match ("203.0.113.0/24"); exact match for anything else (IPv6). */
export function ipAllowed(ip: string, list: string[]) {
  if (!list.length) return true;
  const v4 = (s: string) => {
    const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(s.replace(/^::ffff:/, ""));
    return m ? ((+m[1] << 24) | (+m[2] << 16) | (+m[3] << 8) | +m[4]) >>> 0 : null;
  };
  const a = v4(ip);
  return list.some((entry) => {
    const [base, bits] = entry.split("/");
    if (!bits) return base === ip || base === ip.replace(/^::ffff:/, "");
    const b = v4(base);
    if (a == null || b == null) return false;
    const n = Number(bits);
    const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0;
    return (a & mask) === (b & mask);
  });
}
