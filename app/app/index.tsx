import React from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "../src/texto";
import { Link, Stack, useRouter } from "expo-router";
import { useResultados } from "../src/api";
import { useJugadas } from "../src/jugadas";
import { BannerSinConexion, Bolilla, Chip, ChipFuentes, CuentaRegresiva, Disclaimer, FilaBolillas, Tarjeta } from "../src/componentes";
import { aciertos } from "../src/jugadas";
import { Espacio, usePaleta, useTema } from "../src/design";
import { fechaLarga, horaCorta, instanteSorteo, pesos } from "../src/formato";
import { JUEGOS, JuegoId, ORDEN_JUEGOS, PROVINCIAS, ResumenProvincia, Sorteo, nombreTurno } from "../src/modelos";
import { paletaQuiniela } from "../src/quiniela-detalle";
import { paletaPoceada } from "../src/poceada-detalle";
import { POCEADA, Poceada } from "../src/modelos";

export default function Inicio() {
  const t = useTema();
  const r = useResultados();
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/ajustes" asChild>
              <Pressable accessibilityLabel="Ajustes" hitSlop={12}>
                <Text style={{ color: t.texto, fontSize: 22 }}>⚙︎</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}
        refreshControl={<RefreshControl refreshing={r.cargando} onRefresh={r.recargar} tintColor={t.textoSec} />}
      >
        {r.sinConexion && <BannerSinConexion />}
        {desactualizado(r.ultimos.quini6?.fecha) && (
          <View style={{ backgroundColor: t.avisoFondo, padding: Espacio.m, borderRadius: 10 }} accessibilityRole="text">
            <Text style={{ color: t.aviso, fontSize: 13 }}>Los datos parecen desactualizados. El último sorteo publicado es anterior al esperado; vale el extracto oficial.</Text>
          </View>
        )}
        {ORDEN_JUEGOS.map((j) => (
          <TarjetaJuego key={j} juego={j} sorteo={r.ultimos[j]} />
        ))}
        {r.poceada && <TarjetaPoceada s={r.poceada} />}
        {r.quinielas && r.quinielas.provincias.length > 0 && (
          <View style={{ gap: Espacio.s }}>
            <Text style={{ color: t.textoSec, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Quinielas</Text>
            {r.quinielas.provincias.map((q) => (
              <TarjetaQuiniela key={q.provincia} q={q} />
            ))}
          </View>
        )}
        {r.ultimaActualizacion && (
          <Text style={{ color: t.textoSec, fontSize: 11, textAlign: "center" }}>Actualizado {horaCorta(r.ultimaActualizacion)}</Text>
        )}
        <Disclaimer />
      </ScrollView>
    </>
  );
}

function TarjetaJuego({ juego, sorteo }: { juego: JuegoId; sorteo?: Sorteo }) {
  const t = useTema();
  const p = usePaleta(juego);
  const meta = JUEGOS[juego];
  const router = useRouter();
  const trad = sorteo?.modalidades.tradicional;
  const prox = sorteo?.proximo;
  const objetivo = prox?.fecha ? instanteSorteo(prox.fecha, meta.hora) : null;

  return (
    <Pressable onPress={() => router.push(`/juego/${juego}`)} accessibilityRole="button" accessibilityHint={`Abre el detalle de ${meta.nombre}`}>
      <Tarjeta fondo={p.fondoTarjeta} style={{ borderColor: p.primario + "40", gap: Espacio.s }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: p.primario, fontSize: 22, fontWeight: "700" }}>{meta.nombre}</Text>
          {sorteo && <Chip texto={`Sorteo ${sorteo.sorteo}`} color={p.primario} />}
        </View>
        {sorteo ? (
          <>
            <Text style={{ color: t.textoSec, fontSize: 14 }}>{fechaLarga(sorteo.fecha)}</Text>
            {trad && <FilaBolillas titulo="Tradicional" numeros={trad.numeros} paleta={p} />}
            <View style={{ height: 1, backgroundColor: t.borde, marginVertical: Espacio.xs }} />
            {prox?.pozo != null && <Text style={{ color: p.secundario, fontWeight: "600" }}>Próximo pozo estimado: {pesos(prox.pozo)}</Text>}
            {prox?.fecha && (
              <Text style={{ color: t.textoSec, fontSize: 13 }}>
                Próximo sorteo: {fechaLarga(prox.fecha)} {meta.hora} hs
              </Text>
            )}
            {objetivo && <CuentaRegresiva objetivo={objetivo} />}
            <JugadasEnCurso juego={juego} ultimo={sorteo} paleta={p} />
            {!sorteo.validado && <ChipFuentes fuentes={sorteo.fuentes} validado={false} color={p.primario} />}
          </>
        ) : (
          <Text style={{ color: t.textoSec }}>Todavía no hay resultados cargados.</Text>
        )}
      </Tarjeta>
    </Pressable>
  );
}

/** true si el último Quini 6 publicado es anterior al último sorteo que ya debería estar (mié/dom 21:15 + 2 h). */
function desactualizado(fechaIso?: string): boolean {
  if (!fechaIso) return false;
  const ahora = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(ahora.getTime() - i * 86400000);
    // día en hora Argentina (UTC-3)
    const art = new Date(d.getTime() - 3 * 3600000);
    const dow = art.getUTCDay();
    if (dow === 0 || dow === 3) {
      const iso = art.toISOString().slice(0, 10);
      const limite = new Date(`${iso}T23:15:00-03:00`);
      if (ahora >= limite) return fechaIso < iso;
    }
  }
  return false;
}

function TarjetaQuiniela({ q }: { q: ResumenProvincia }) {
  const t = useTema();
  const p = paletaQuiniela(t.oscuro);
  const router = useRouter();
  const nombre = PROVINCIAS[q.provincia]?.corto ?? q.nombre;
  return (
    <Pressable onPress={() => router.push(`/quiniela/${q.provincia}`)} accessibilityRole="button" accessibilityHint={`Abre la quiniela de ${nombre}`}>
      <Tarjeta fondo={p.fondoTarjeta} style={{ gap: Espacio.xs }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: p.primario, fontSize: 17, fontWeight: "700" }}>{nombre}</Text>
          <Text style={{ color: t.textoSec, fontSize: 12 }}>{fechaLarga(q.fecha)}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Espacio.s }} accessible accessibilityLabel={`${nombre}: ${q.turnos.map((x) => `${nombreTurno(x.turno)} ${x.cabeza ?? "sin datos"}`).join(", ")}`}>
          {q.turnos.map((x) => (
            <View key={x.turno} style={{ alignItems: "center", minWidth: 58 }}>
              <Text style={{ color: t.textoSec, fontSize: 11 }}>{nombreTurno(x.turno)}</Text>
              <Text style={{ color: t.texto, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: 1 }}>
                {x.cabeza ?? "—"}
              </Text>
            </View>
          ))}
          {q.turnos.length === 0 && <Text style={{ color: t.textoSec, fontSize: 13 }}>Sin sorteos publicados todavía.</Text>}
        </View>
      </Tarjeta>
    </Pressable>
  );
}

function TarjetaPoceada({ s }: { s: Poceada }) {
  const t = useTema();
  const p = paletaPoceada(t.oscuro);
  const router = useRouter();
  const prox = s.proximo;
  const objetivo = prox?.fecha ? instanteSorteo(prox.fecha, POCEADA.hora) : null;
  return (
    <Pressable onPress={() => router.push("/poceada")} accessibilityRole="button" accessibilityHint="Abre el detalle de la Poceada">
      <Tarjeta fondo={p.fondoTarjeta} style={{ borderColor: p.primario + "40", gap: Espacio.s }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: p.primario, fontSize: 22, fontWeight: "700" }}>Poceada</Text>
          <Chip texto={`Sorteo ${s.sorteo}`} color={p.primario} />
        </View>
        <Text style={{ color: t.textoSec, fontSize: 14 }}>{fechaLarga(s.fecha)}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }} accessible accessibilityLabel={`Números: ${s.numeros.join(", ")}`}>
          {s.numeros.map((n) => (
            <View key={n} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: p.bolilla }}>
              <Text style={{ color: p.textoBolilla, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{n}</Text>
            </View>
          ))}
        </View>
        {prox?.pozo != null && <Text style={{ color: p.secundario, fontWeight: "600" }}>Próximo pozo estimado: {pesos(prox.pozo)}</Text>}
        {objetivo && <CuentaRegresiva objetivo={objetivo} />}
        {!s.validado && <ChipFuentes fuentes={s.fuentes} validado={false} color={p.primario} />}
      </Tarjeta>
    </Pressable>
  );
}

/** Jugadas vigentes del usuario para este juego (las "para el próximo sorteo" y las "siempre"). */
function JugadasEnCurso({ juego, ultimo, paleta }: { juego: JuegoId; ultimo: Sorteo; paleta: ReturnType<typeof usePaleta> }) {
  const t = useTema();
  const js = useJugadas();
  const vigentes = js.de(juego).filter((j) => !j.resultado);
  if (vigentes.length === 0) return null;
  return (
    <View style={{ gap: Espacio.xs, marginTop: Espacio.xs, paddingTop: Espacio.s, borderTopWidth: 1, borderTopColor: t.borde }}>
      {vigentes.slice(0, 3).map((j) => {
        const paraProximo = j.objetivo != null && j.objetivo > ultimo.sorteo;
        const hits = paraProximo ? [] : Array.from(new Set(Object.values(aciertos(j, ultimo)).flat()));
        const etiqueta = j.objetivo == null ? "la jugás siempre" : paraProximo ? `para el sorteo ${j.objetivo}` : `sorteo ${j.objetivo}`;
        return (
          <View key={j.id} accessible accessibilityLabel={`Tu jugada ${j.nombre || ""}: ${j.numeros.join(", ")}, ${etiqueta}`}>
            <Text style={{ color: t.textoSec, fontSize: 12 }}>
              Tu jugada{j.nombre ? ` "${j.nombre}"` : ""} · {etiqueta}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
              {j.numeros.map((n) => (
                <Bolilla key={n} numero={n} paleta={paleta} resaltada={hits.includes(n)} tamano={30} />
              ))}
            </View>
          </View>
        );
      })}
      {vigentes.length > 3 && <Text style={{ color: t.textoSec, fontSize: 12 }}>y {vigentes.length - 3} más</Text>}
    </View>
  );
}
