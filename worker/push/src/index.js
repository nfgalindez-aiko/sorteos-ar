// Endpoints:
//   POST /registrar  {token, temas:[...]}   cabecera x-sorteos-key = APP_KEY (la app)
//   POST /baja       {token}                cabecera x-sorteos-key = APP_KEY
//   POST /enviar     {tema, titulo, cuerpo, data}  cabecera x-sorteos-send = SEND_KEY (el backend)
// KV: "t:<token>" -> {temas, alta}   y   "s:<tema>:<token>" -> "1" (para listar por tema).
const TEMAS_VALIDOS = new Set(["quini6", "brinco", "lotoplus", "poceada",
  "quiniela:ciudad", "quiniela:provincia", "quiniela:santafe", "quiniela:cordoba", "quiniela:uruguay", "quiniela:mendoza", "quiniela:entrerios"]);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-sorteos-key, x-sorteos-send", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...CORS } });
const esToken = (t) => typeof t === "string" && /^ExponentPushToken\[[A-Za-z0-9_-]{10,60}\]$/.test(t);

async function borrarSuscripciones(env, token) {
  const prev = await env.SUSCRIPCIONES.get("t:" + token, "json");
  if (prev && Array.isArray(prev.temas)) await Promise.all(prev.temas.map((t) => env.SUSCRIPCIONES.delete(`s:${t}:${token}`)));
  await env.SUSCRIPCIONES.delete("t:" + token);
}

async function tokensDe(env, tema) {
  const out = [];
  let cursor;
  do {
    const r = await env.SUSCRIPCIONES.list({ prefix: `s:${tema}:`, cursor, limit: 1000 });
    for (const k of r.keys) out.push(k.name.slice(`s:${tema}:`.length));
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return out;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "POST") return json({ error: "no" }, 404);
    const path = new URL(req.url).pathname;
    let d;
    try { d = await req.json(); } catch { return json({ error: "json" }, 400); }

    if (path === "/registrar" || path === "/baja") {
      if (!env.APP_KEY || req.headers.get("x-sorteos-key") !== env.APP_KEY) return json({ error: "clave" }, 401);
      if (!esToken(d.token)) return json({ error: "token" }, 400);
      await borrarSuscripciones(env, d.token);
      if (path === "/baja") return json({ ok: true, temas: [] });
      const temas = Array.from(new Set((Array.isArray(d.temas) ? d.temas : []).filter((t) => TEMAS_VALIDOS.has(t)))).slice(0, 20);
      if (temas.length) {
        await env.SUSCRIPCIONES.put("t:" + d.token, JSON.stringify({ temas, alta: new Date().toISOString() }));
        await Promise.all(temas.map((t) => env.SUSCRIPCIONES.put(`s:${t}:${d.token}`, "1")));
      }
      return json({ ok: true, temas });
    }

    if (path === "/enviar") {
      if (!env.SEND_KEY || req.headers.get("x-sorteos-send") !== env.SEND_KEY) return json({ error: "clave" }, 401);
      if (!TEMAS_VALIDOS.has(d.tema)) return json({ error: "tema" }, 400);
      const titulo = String(d.titulo || "").slice(0, 80), cuerpo = String(d.cuerpo || "").slice(0, 200);
      const tokens = await tokensDe(env, d.tema);
      let enviados = 0, bajas = 0, errores = 0;
      for (let i = 0; i < tokens.length; i += 100) {
        const lote = tokens.slice(i, i + 100).map((to) => ({ to, title: titulo, body: cuerpo, sound: "default", data: d.data || {}, channelId: "sorteos" }));
        const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(lote) });
        const res = await r.json().catch(() => ({}));
        const tickets = Array.isArray(res.data) ? res.data : [];
        for (let k = 0; k < tickets.length; k++) {
          const t = tickets[k];
          if (t.status === "ok") enviados++;
          else { errores++; if (t.details && t.details.error === "DeviceNotRegistered") { await borrarSuscripciones(env, lote[k].to); bajas++; } }
        }
      }
      return json({ ok: true, tema: d.tema, destinatarios: tokens.length, enviados, errores, bajas });
    }
    return json({ error: "no" }, 404);
  },
};
