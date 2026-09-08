# Textos de App Store (borrador, Fase 3 · paso 11)

Reglas aplicadas: sin "Quini", "Brinco" ni "Lotería de Santa Fe" en nombre, subtítulo ni
palabras clave de marca; nombres de juegos solo dentro de la descripción, de forma descriptiva;
disclaimer completo; sin llamados a jugar/apostar/comprar; sin la palabra "oficial" fuera del
disclaimer. Clasificación 17+. Categoría principal: Noticias. Secundaria: Utilidades.

## Nombre (máx. 30)

Sorteos AR

## Subtítulo (máx. 30)

Resultados de loterías en AR

## Texto promocional (máx. 170, editable sin nueva versión)

Resultados de los sorteos poceados argentinos la misma noche, confirmados por dos fuentes, con histórico y control de tus números. Sin apuestas.

## Descripción (máx. 4000)

Sorteos AR es una aplicación informativa independiente para consultar los resultados de las loterías poceadas de Argentina. No permite apostar ni comprar cupones: solo muestra los números sorteados, los premios y el pozo estimado del próximo sorteo.

QUÉ PODÉS VER
• Último sorteo de Quini 6 (Tradicional, Segunda vuelta, Revancha, Siempre sale y Pozo extra), Brinco (Tradicional y Junior) y Loto Plus (Tradicional, Match, Desquite, Sale o sale y Número Plus).
• Poceada de la Ciudad: los 20 números, letras, premios y próximo pozo.
• Tabla de premios por modalidad: aciertos, cantidad de ganadores y premio por apuesta.
• Pozo estimado y cuenta regresiva al próximo sorteo.
• Notificaciones opcionales: elegís qué sorteos y qué quinielas te avisan cuando el resultado queda confirmado.
• Quinielas Nacional (Ciudad), Provincia de Buenos Aires, Santa Fe, Córdoba, Mendoza, Entre Ríos y Montevideo: los 20 números de cada turno, con la cabeza destacada y las letras.
• Histórico de sorteos anteriores.
• Controlar tus números: cargás tus 6 números y la app marca cuáles salieron en cada modalidad. Solo compara; no recomienda ni sugiere números.

CÓMO FUNCIONA
• Cada sorteo se publica cuando dos fuentes independientes coinciden número por número. Si no coinciden, el sorteo aparece como pendiente de confirmación.
• Funciona sin conexión con el último resultado guardado.
• Sin cuenta, sin registro y sin publicidad. Tus jugadas quedan solo en tu dispositivo.
• Compatible con VoiceOver y Dynamic Type.

AVISO
Aplicación informativa independiente. No está afiliada a Lotería de Santa Fe, a Lotería de la Ciudad ni a ningún organismo oficial. No permite apostar. Ante cualquier discrepancia vale el extracto oficial. Jugar compulsivamente es perjudicial para la salud. +18.

Los nombres de los juegos se mencionan únicamente con fines descriptivos y pertenecen a sus respectivos titulares.

## Palabras clave (máx. 100 caracteres, separadas por coma, sin espacios)

resultados,sorteos,loteria,poceado,argentina,numeros,ganadores,pozo,extracto,control

Nota: se dejan fuera "quini" y "brinco" a propósito (regla 4 del brief: sin marcas). Si un
abogado confirma que el uso descriptivo en palabras clave es defendible, se pueden agregar.

## URL de soporte / política de privacidad

- Política de privacidad (publicada): `https://nfgalindez.com/sorteos/privacidad/`
- URL de soporte (publicada): `https://nfgalindez.com/sorteos/soporte/`
- Términos: `https://nfgalindez.com/sorteos/terminos/` · Página de la app: `https://nfgalindez.com/sorteos/`
- Esas páginas se generan con `generar.py` en el repo `nfgalindez-aiko/nfgalindez.com` y se
  despliegan con `npx wrangler pages deploy site --project-name nfgalindez`. La copia en
  `docs/privacidad.*` de este repo es respaldo; la canónica es la de nfgalindez.com.

## Clasificación por edades (cuestionario de App Store Connect)

- "Juegos de azar y concursos (simulados)": Ninguno.
- "Juegos de azar con dinero real": No (la app no permite apostar).
- Marcar "Restringir a 17+" manualmente para respetar el +18 del brief.
- Guideline 5.3 (Gaming, Gambling, and Lotteries): la app no vende ni facilita la compra de
  cupones, no enlaza a sitios de apuestas y es solo de consulta.

## Capturas sugeridas (6,7" y 6,5"; modo claro y oscuro)

1. Inicio con las dos tarjetas y la cuenta regresiva.
2. Detalle de Quini 6 con las cuatro modalidades en bolillas.
3. Tabla de premios y pozo extra.
4. Histórico.
5. Controlar jugada con aciertos marcados.
6. Ajustes con el disclaimer.

## Notas para el revisor (App Review)

"Aplicación de solo consulta de resultados de loterías. No permite apostar, comprar ni enlaza
a sitios de apuestas. Los datos provienen de un JSON público estático generado por nuestro
backend a partir de dos fuentes de resultados; no se requiere cuenta. Las jugadas que el
usuario carga se guardan localmente para comparar con los números sorteados."


## Privacidad en App Store Connect (versión 1.1, con notificaciones)

Cambiar "No se recopilan datos" por: **Identificadores → ID del dispositivo** (token de push), uso
"Funcionalidad de la app", **no vinculado** a la identidad, **no** usado para rastreo. Hacerlo ANTES
de enviar la 1.1 a revisión. La política del sitio ya lo describe.
