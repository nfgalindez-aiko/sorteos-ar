# Pruebas de TestFlight — compilación 12 (versión 1.0)

Instalar desde TestFlight la **compilación 12**. Si la app ya está instalada desde una
compilación anterior, TestFlight ofrece "Actualizar".

Marcá lo que falle y pasame el número del punto. No hace falta que pruebes todo de una.

---

## A. Arranque y pantalla principal

1. Abrir la app con datos/wifi. Carga sin pantalla en blanco ni error.
2. Aparece una tarjeta por juego: Quini 6, Brinco, Loto Plus, Poceada.
3. Cada tarjeta muestra el último sorteo, el pozo estimado del próximo y la cuenta regresiva.
4. La cuenta regresiva baja sola (mirala 5 segundos).
5. Tirar hacia abajo para refrescar: gira y vuelve con datos.
6. Aparecen las quinielas: Ciudad, Provincia, Santa Fe, Córdoba, Mendoza, Entre Ríos, Montevideo.
7. Se ve el aviso legal (app independiente, no afiliada, juego responsable, 18+).

## B. Detalle de un juego

8. Tocar Quini 6. Se abren las modalidades: tradicional, segunda, revancha, siempre sale.
9. Los números están ordenados y la tabla de premios muestra aciertos, ganadores y premio.
10. Tocar la etiqueta "2 fuentes" (o "1 fuente"). Lista los sitios que confirmaron el resultado.
11. Volver atrás con el gesto y con la flecha. No se traba.
12. Repetir en Brinco y en Loto Plus.

## C. Sorteos anteriores

13. Entrar a "Sorteos anteriores" de un juego. Lista de sorteos, del más nuevo al más viejo.
14. Tocar uno viejo. Abre con sus números y su tabla de premios, no con los del último.
15. Bajar hasta el final de la lista. No se corta ni se cuelga.

## D. Controlar jugada

16. "Controlar jugada" en Quini 6. Cargar 6 números.
17. Marca cuáles salieron en cada modalidad.
18. Salir de la app, volver a entrar: la jugada sigue guardada.
19. Guardar una segunda jugada. Conviven las dos.
20. "Repetir" una jugada para el sorteo siguiente: la copia sin que tengas que retipear.
21. Cuando sale un sorteo nuevo, la jugada vieja pasa a "Anteriores" con su resultado congelado.
22. Borrar una jugada. Desaparece y no vuelve al reabrir la app.

## E. Quinielas

23. Entrar a la quiniela de Ciudad. Se ven los turnos del día: previa, primera, matutina,
    vespertina, nocturna.
24. Cada turno muestra 20 números de 4 cifras.
25. Entrar al histórico de la quiniela y abrir un día anterior.
26. Probar Montevideo, que solo tiene vespertina y nocturna.

## F. Poceada

27. Entrar a Poceada. 20 números, premios y próximo pozo.
28. Histórico de Poceada: abrir un sorteo anterior.

## G. Notificaciones

29. Ajustes. La sección Notificaciones está arriba de todo.
30. Activar notificaciones. iOS pide permiso una sola vez. Aceptar.
31. Encender solo Quini 6. Apagar el resto.
32. "Apagar todas" apaga todo de una.
33. Cerrar y reabrir la app: los interruptores quedaron como los dejaste.
34. Cuando salga un sorteo que tengas encendido, llega la notificación.
35. Tocar la notificación: abre la pantalla de ese sorteo, no la pantalla principal.

## H. Ajustes y reportes

36. Se ve el aviso legal completo y las fuentes de datos.
37. "Borrar jugadas guardadas" borra todo y pide confirmación.
38. "Reportar un problema": escribir un texto y enviarlo. Confirma el envío.
    (El mail llega a nfgalindez@gmail.com, avisame si no aparece.)

## I. Casos borde

39. **Sin conexión**: poner modo avión y abrir la app. Muestra los últimos resultados guardados
    y avisa que no hay conexión. No pantalla en blanco ni error feo.
40. **Volver la conexión**: sacar modo avión y refrescar. Se actualiza.
41. **Texto grande**: Ajustes de iOS, Pantalla y brillo, Tamaño del texto al máximo. Abrir la app.
    Los números no se cortan ni se superponen. Este fue el error de la compilación 7.
42. **Modo oscuro**: cambiar el aspecto en iOS. La app se ve bien en los dos.
43. **Rotar el teléfono** si tenés la rotación activada.
44. **Dejar la app abierta 10 minutos** y volver. No se cuelga ni pierde los datos.

## J. Lo que NO tiene que aparecer nunca

45. Ningún botón, link ni mención que lleve a apostar o comprar un cartón.
46. Ninguna publicidad.
47. Ningún pedido de mail, teléfono, nombre, ubicación o cuenta.
48. Ninguna sugerencia de números "que van a salir".

---

## Nota sobre esta compilación

El código de la app de la compilación 12 es **idéntico** al de la 11. Entre una y otra solo
cambió el backend (el arreglo del desfasaje entre fuentes) y documentación. Lo que cambia es el
canal: la 12 usa el canal `production`, que es el correcto para la App Store.

Consecuencia práctica: la compilación 12 **no recibe** los `eas update` que se publiquen al canal
`testflight`. Corre su código embebido. Si hace falta corregir algo durante las pruebas, se
compila de nuevo o se publica al canal `production`.
