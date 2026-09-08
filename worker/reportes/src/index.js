// POST /reporte  {texto, contacto?, contexto:{pantalla, juego, sorteo, version, so}}
// Cabecera x-sorteos-key: clave compartida con la app (secreto APP_KEY). No es un secreto fuerte
// (una app se puede descompilar): sirve para frenar spam casual. Ademas: limite de tamaño,
// 1 reporte por minuto por IP (Cache API) y nada de HTML en el mail.
import { EmailMessage } from "cloudflare:email";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-sorteos-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });
const limpiar = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").slice(0, max);

function mime(from, to, subject, body) {
  const b64 = btoa(unescape(encodeURIComponent(body)));
  const subj = "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(subject))) + "?=";
  return [
    `From: Sorteos AR <${from}>`, `To: <${to}>`, `Subject: ${subj}`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@nfgalindez.com>`, "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64, "",
  ].join("\r\n");
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "POST" || new URL(req.url).pathname !== "/reporte") return json({ error: "no" }, 404);
    if (!env.APP_KEY || req.headers.get("x-sorteos-key") !== env.APP_KEY) return json({ error: "clave" }, 401);

    const ip = req.headers.get("cf-connecting-ip") || "0";
    const cache = caches.default;
    const llave = new Request(`https://limite.sorteos-ar.invalid/${ip}`);
    if (await cache.match(llave)) return json({ error: "esperá un minuto antes de mandar otro" }, 429);

    let d;
    try { d = await req.json(); } catch { return json({ error: "json" }, 400); }
    const max = Number(env.MAX_CARACTERES || 2000);
    const texto = limpiar(d.texto, max).trim();
    if (texto.length < 5) return json({ error: "texto muy corto" }, 400);
    const contacto = limpiar(d.contacto, 120).trim();
    const c = d.contexto || {};
    const ctx = ["pantalla", "juego", "sorteo", "version", "so", "dispositivo"].map((k) => `${k}: ${limpiar(c[k], 80)}`).join("\n");

    const body = `Reporte desde la app Sorteos AR\n\n${texto}\n\n---\nContacto (opcional): ${contacto || "-"}\n${ctx}\nfecha: ${new Date().toISOString()}\nip: ${ip}\n`;
    try {
      await env.MAIL.send(new EmailMessage(env.REMITENTE, env.MAIL.destination_address || "nfgalindez@gmail.com", mime(env.REMITENTE, env.MAIL.destination_address || "nfgalindez@gmail.com", `[Sorteos AR] Reporte: ${texto.slice(0, 60)}`, body)));
    } catch (e) {
      return json({ error: "no se pudo enviar", detalle: String(e) }, 502);
    }
    await cache.put(llave, new Response("1", { headers: { "cache-control": "max-age=60" } }));
    return json({ ok: true });
  },
};
