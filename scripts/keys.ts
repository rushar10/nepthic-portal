/* Prints a fresh signing key pair and encryption key for the portal.
   - PORTAL_PRIVATE_KEY goes in the portal's environment ONLY.
   - PORTAL_PUBLIC_KEY goes in each site's environment (Wholesale, Events, and Clothing once
     it has the admin API). A site with only the public key can check portal requests but
     can never create one.
   Rotate by generating a new pair, setting the public key on every site, then the private
   key on the portal. */
import crypto from "node:crypto";

const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const oneLine = (pem: string) => pem.trim().replace(/\n/g, "\\n");
console.log("# Portal .env");
console.log(`PORTAL_PRIVATE_KEY="${oneLine(privateKey.export({ type: "pkcs8", format: "pem" }).toString())}"`);
console.log(`PORTAL_ENCRYPTION_KEY="${crypto.randomBytes(32).toString("base64")}"`);
console.log("\n# Each site's .env (Wholesale, Events, Clothing)");
console.log(`PORTAL_PUBLIC_KEY="${oneLine(publicKey.export({ type: "spki", format: "pem" }).toString())}"`);
