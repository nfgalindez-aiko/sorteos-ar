// "¿Ves algún error? Dejámelo acá": el usuario escribe, la app lo manda al Worker y el Worker
// se lo envía por mail al dueño. Sin exponer direcciones ni abrir el correo del usuario.
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { Text } from "../src/texto";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Boton, Tarjeta } from "../src/componentes";
import { Espacio, Radio, useTema } from "../src/design";
import { enviarReporte } from "../src/reportes";

export default function Reporte() {
  const { pantalla, juego, sorteo } = useLocalSearchParams<{ pantalla?: string; juego?: string; sorteo?: string }>();
  const t = useTema();
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [contacto, setContacto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<{ ok: boolean; msg: string } | null>(null);
  const color = t.oscuro ? "#7FD1C7" : "#0F6E63";

  const enviar = async () => {
    setEnviando(true);
    setEstado(null);
    const r = await enviarReporte(texto, contacto, { pantalla: pantalla ?? "desconocida", juego, sorteo });
    setEnviando(false);
    if (r.ok) {
      setEstado({ ok: true, msg: "Enviado. Gracias por avisar." });
      setTexto("");
      setTimeout(() => router.back(), 1500);
    } else {
      setEstado({ ok: false, msg: r.error });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Reportar un error" }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: t.textoSec, fontSize: 14, lineHeight: 20 }}>
            ¿Un número que no coincide con el extracto, algo que no carga, un texto mal? Contalo acá y le llega directo al desarrollador. No hace falta dejar ningún dato.
          </Text>
          <TextInput
            placeholder="Qué viste, en qué pantalla y qué esperabas"
            placeholderTextColor={t.textoSec}
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            style={{ minHeight: 140, backgroundColor: t.superficie, color: t.texto, padding: 12, borderRadius: Radio.chip, borderWidth: 1, borderColor: t.borde, fontSize: 16 }}
            accessibilityLabel="Descripción del error"
          />
          <TextInput
            placeholder="Cómo contactarte, si querés respuesta (opcional)"
            placeholderTextColor={t.textoSec}
            value={contacto}
            onChangeText={setContacto}
            maxLength={120}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ backgroundColor: t.superficie, color: t.texto, padding: 12, borderRadius: Radio.chip, borderWidth: 1, borderColor: t.borde, fontSize: 16 }}
            accessibilityLabel="Contacto opcional"
          />
          <Tarjeta style={{ gap: 4 }}>
            <Text style={{ color: t.textoSec, fontSize: 12 }}>Se adjunta solo para ubicar el problema:</Text>
            <Text style={{ color: t.texto, fontSize: 12 }}>
              pantalla: {pantalla ?? "-"}{juego ? ` · juego: ${juego}` : ""}{sorteo ? ` · sorteo: ${sorteo}` : ""} · versión de la app y del sistema
            </Text>
            <Text style={{ color: t.textoSec, fontSize: 12 }}>No se envía nada más: ni tus jugadas, ni tu ubicación, ni identificadores.</Text>
          </Tarjeta>
          <View style={{ flexDirection: "row" }}>
            <Boton titulo={enviando ? "Enviando…" : "Enviar reporte"} color={color} relleno disabled={enviando || texto.trim().length < 5} onPress={enviar} />
          </View>
          {estado && (
            <Text style={{ color: estado.ok ? color : t.aviso, fontSize: 14, textAlign: "center" }} accessibilityLiveRegion="polite">
              {estado.msg}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
