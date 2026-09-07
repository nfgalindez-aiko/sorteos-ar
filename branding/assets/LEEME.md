# Sorteos AR — kit de marca

**La marca:** dos círculos = dos fuentes de resultados independientes. La intersección
encendida —el único número que las dos publican igual— es el 17.

## SVG (vectorial, para web y para escalar sin pérdida)
- `svg/icono-appstore-1024.svg` — fondo cuadrado, sin transparencia ni esquinas redondeadas (lo que pide App Store; iOS aplica la máscara).
- `svg/icono-web-redondeado.svg` — versión con esquinas redondeadas para la web.
- `svg/config-1-celeste-y-blanco.svg`, `config-2-sol-de-mayo.svg`, `config-3-bandera-invertida.svg` — las tres paletas argentinas.
- `svg/icono-sobre-claro.svg`, `svg/icono-monocromo.svg` (usa `currentColor`: hereda el color del texto).
- `svg/lockup-horizontal.svg`, `svg/logotipo-solo.svg`.

## PNG
`png/` trae el ícono primario en 1024, 512, 256, 180, 120, 87, 60 y 40 px (los tamaños de iOS y del favicon).

## Tipografía
Archivo (Google Fonts), pesos 500 / 600 / 800. En los SVG con texto el logotipo va como
`<text>`: si lo vas a usar donde no esté Archivo cargada, abrilo en Figma/Illustrator y
convertí el texto a curvas.

## Colores
`paleta.css` (variables listas para pegar) y `paleta.json`.
