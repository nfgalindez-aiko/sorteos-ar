// Pedido de valoración en la App Store.
//
// Reglas que manda iOS, no nosotros: el sistema muestra el cartel como mucho 3 veces por año y
// por persona, y decide si lo muestra o no. Nosotros solo podemos PEDIRLO. Por eso no tiene
// sentido programar "cada 5 aperturas": se gastarían los tres pedidos en una semana.
//
// Cuándo se pide: a las 10, 40 y 100 aperturas. Nunca en la primera sesión, nunca dos veces el
// mismo día, y nunca justo después de un error: se llama desde la portada solo cuando hay
// resultados en pantalla, que es el momento en que la app hizo lo que promete.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const CLAVE = "sorteos-valoracion";
/** Aperturas en las que se pide. Tres, como el tope anual de iOS. */
const HITOS = [10, 40, 100];

interface Estado {
  aperturas: number;
  /** Hitos ya usados, para no repetir si el usuario borra y reinstala en el mismo mes. */
  pedidos: number[];
  /** Último día en que se pidió, en formato AAAA-MM-DD. */
  ultimoDia?: string;
}

async function leer(): Promise<Estado> {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    if (raw) {
      const e = JSON.parse(raw) as Partial<Estado>;
      return { aperturas: e.aperturas ?? 0, pedidos: e.pedidos ?? [], ultimoDia: e.ultimoDia };
    }
  } catch {
    /* sin storage: se empieza de cero y no se rompe nada */
  }
  return { aperturas: 0, pedidos: [] };
}

async function guardar(e: Estado): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE, JSON.stringify(e));
  } catch {
    /* si no se puede guardar, como mucho se vuelve a contar desde cero */
  }
}

/**
 * Suma una apertura y, si toca, le pide a iOS que muestre el cartel de valoración.
 * Llamar una sola vez por arranque y solo con resultados ya en pantalla.
 */
export async function registrarApertura(): Promise<void> {
  const e = await leer();
  e.aperturas += 1;

  const hoy = new Date().toISOString().slice(0, 10);
  const hito = HITOS.find((h) => e.aperturas >= h && !e.pedidos.includes(h));
  const puede = hito != null && e.ultimoDia !== hoy;

  if (puede) {
    try {
      // disponible() es false en simulador y si el usuario desactivó las valoraciones
      if ((await StoreReview.hasAction()) && (await StoreReview.isAvailableAsync())) {
        await StoreReview.requestReview();
        e.pedidos.push(hito as number);
        e.ultimoDia = hoy;
      }
    } catch {
      /* que no se muestre el cartel no puede romper el arranque de la app */
    }
  }
  await guardar(e);
}
