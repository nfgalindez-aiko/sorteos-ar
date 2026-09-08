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
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/tick") {
      // diagnóstico: corre la misma lógica que el cron y devuelve el estado de GitHub
      const motivo = toca(); // sin "force": solo dispara dentro de las ventanas, igual que el cron
      if (!motivo) return new Response("fuera de ventana", { status: 200 });
      if (!env.GITHUB_TOKEN) return new Response("sin GITHUB_TOKEN", { status: 500 });
      const r = await fetch(`https://api.github.com/repos/${env.REPO}/actions/workflows/${env.WORKFLOW}/dispatches`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "sorteos-ar-cron", "x-github-api-version": "2022-11-28" },
        body: JSON.stringify({ ref: "main" }),
      });
      const h = ["x-accepted-github-permissions", "x-oauth-scopes", "x-ratelimit-remaining"].map((k) => `${k}=${r.headers.get(k)}`).join(" | ");
      const repo = await fetch(`https://api.github.com/repos/${env.REPO}`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, "user-agent": "sorteos-ar-cron" } });
      const wf = await fetch(`https://api.github.com/repos/${env.REPO}/actions/workflows`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, "user-agent": "sorteos-ar-cron" } });
      return new Response(`${motivo}: github ${r.status} ${(await r.text()).slice(0, 200)}
${h}
repo=${repo.status} workflows=${wf.status}`, { status: 200 });
    }
    return new Response(`sorteos-ar-cron. ventana actual: ${toca() || "ninguna"}`, { headers: { "content-type": "text/plain" } });
  },
};
