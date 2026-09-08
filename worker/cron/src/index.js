// Ventanas (hora Argentina, UTC-3, sin horario de verano):
//  - Quinielas: lunes a sábado 10:00-23:00, cada 15 min.
//  - Quini 6: mié y dom 21:00-23:59, cada 5 min. Brinco: dom. Loto Plus: mié y sáb 21:00-23:59, cada 5 min.
//  - Poceada: lun a sáb 21:00-23:00 (ya cubierto por quinielas cada 15 + noches).
//  - Además una corrida diaria a las 12:00.
function ahoraART() {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return { dow: d.getUTCDay(), h: d.getUTCHours(), m: d.getUTCMinutes() };
}
function toca() {
  const { dow, h, m } = ahoraART();
  const lunSab = dow >= 1 && dow <= 6;
  if (lunSab && h >= 10 && h <= 22 && m % 15 === 0) return "quinielas";
  const nocheSorteo = (dow === 3 || dow === 0 || dow === 6) && h >= 21 && h <= 23;
  if (nocheSorteo) return "sorteo";
  if (h === 12 && m === 0) return "diaria";
  return null;
}

export default {
  async scheduled(_ev, env, ctx) {
    const motivo = toca();
    if (!motivo) return;
    if (!env.GITHUB_TOKEN) { console.log("sin GITHUB_TOKEN"); return; }
    const r = await fetch(`https://api.github.com/repos/${env.REPO}/actions/workflows/${env.WORKFLOW}/dispatches`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "sorteos-ar-cron", "x-github-api-version": "2022-11-28" },
      body: JSON.stringify({ ref: "main" }),
    });
    console.log(`${motivo}: dispatch -> ${r.status}`);
  },
  async fetch() {
    return new Response(`sorteos-ar-cron. ventana actual: ${toca() || "ninguna"}`, { headers: { "content-type": "text/plain" } });
  },
};
