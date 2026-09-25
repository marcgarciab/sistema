# Imágenes de medallas

1. Sube tu imagen a esta carpeta (`public/medals/`). Recomendado: PNG o WebP
   **cuadrado** con fondo transparente, 256×256 px o más, o SVG.
2. Abre `public/config/assets.json` y pon la ruta en la clave correspondiente:

```json
"ranks": {
  "Fundador 1%": "/medals/fundador.png"
},
"categories": {
  "Fuerza": "/medals/fuerza.webp"
}
```

3. Despliega (`npm run deploy`). Cualquier clave que siga en `null` usa la insignia
   circular con color de acento.

- `ranks` → insignia del rango (ranking, hero y escalera de rangos).
- `categories` → icono de cada logro en el detalle del cliente. `Fidelidad` se usa
  para las medallas de fidelidad (que no son filas en Notion).
- `hero.image` → imagen de fondo opcional del hero (p. ej. `/hero/hero.jpg`, en
  `public/hero/`). Se funde con el degradado; el diseño funciona sin ella.

## Vídeo del hero

`hero.video` (MP4) + `hero.videoWebm` (WebM, opcional) + `hero.poster` (imagen fija) en
`public/hero/`. Sustituye a la medalla central del hero. El fondo negro del vídeo se funde
con la página (máscara en los bordes; el trofeo queda opaco), así que el vídeo debe tener
**fondo negro/muy oscuro**, sin sonido y en bucle. Con `"video": null` vuelve la medalla.

## Tarjeta del fundador

`founder` en `config/assets.json`: nombre, título, frase, foto (`public/founder/`) y lista de
logros (`title`, `category`, `date` opcional). Aparece al final de la página, sin posición
ni rango. `"show": false` la oculta.
