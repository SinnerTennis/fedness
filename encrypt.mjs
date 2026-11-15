// Cifra data.js → data.enc.json (AES-256-GCM, chiave da PBKDF2-SHA256). Rilanciare a ogni modifica di data.js.
// uso: node encrypt.mjs "frase lunga che ricordi"
import { readFileSync, writeFileSync } from "node:fs";

const pw = process.argv[2];
if (!pw || pw.length < 12) { console.error('uso: node encrypt.mjs "frase di almeno 12 caratteri"'); process.exit(1); }

const { subtle } = globalThis.crypto, te = new TextEncoder(), it = 600000;
const b64 = b => Buffer.from(b).toString("base64");
const file = n => new URL(n, import.meta.url);
const derive = async (salt, use) => subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: it, hash: "SHA-256" },
  await subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveKey"]),
  { name: "AES-GCM", length: 256 }, false, [use]);

const plain = readFileSync(file("data.js"), "utf8");
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const ct = await subtle.encrypt({ name: "AES-GCM", iv }, await derive(salt, "encrypt"), te.encode(plain));

// self-check: decifra di nuovo e confronta, come farà il browser
const back = new TextDecoder().decode(await subtle.decrypt({ name: "AES-GCM", iv }, await derive(salt, "decrypt"), ct));
if (back !== plain) throw new Error("roundtrip fallito");
const { DIET, SHOPPING } = new Function(back + ";return {DIET,SUBS,SHOPPING}")();
if (DIET.length !== 7 || !SHOPPING.length) throw new Error("data.js non valido");

writeFileSync(file("data.enc.json"), JSON.stringify({ it, salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
console.log("ok → data.enc.json");
