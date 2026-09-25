# Hall of Fame · Sistema 1%

Ranking público del Club 1%, servido por un **Cloudflare Worker** con estático nativo
(`/public`) y sincronizado desde Notion por un **Cron Trigger** cada 30 minutos.

```
Notion (Clientes + Hall of Fame) ──cron */30──▶ Worker.scheduled ──▶ KV (hof:data)
                                                                   │
Visitante ──▶ Worker.fetch "/" ──▶ index.html + datos de KV inyectados (HTMLRewriter)
```

- Las visitas **nunca** llaman a Notion: solo leen KV. Única excepción: si KV está vacío
  (primer despliegue) se lanza **una** sincronización en segundo plano, con lock.
- Si una sincronización falla, KV conserva la última versión buena.
- Al JSON público solo llegan nombre, total, rango y logros. Email, teléfono y Estado
  **no salen** de Notion. Los clientes de baja siguen apareciendo (no se filtra por Estado).

## Despliegue automático (recomendado, sin terminal)

El workflow `.github/workflows/deploy.yml` hace todo solo en GitHub: crea el KV, despliega,
guarda el token de Notion en Cloudflare y lanza la primera sincronización. Solo necesita
estos secrets en GitHub (*Settings → Secrets and variables → Actions → New repository secret*):

| Secret | De dónde sale |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → *My Profile → API Tokens → Create Token* → plantilla **Edit Cloudflare Workers** |
| `NOTION_TOKEN` | notion.so/profile/integrations → tu integración → *Internal Integration Secret* |
| `CLOUDFLARE_ACCOUNT_ID` | Opcional; solo si tu token tiene acceso a varias cuentas |

Cada cambio subido vuelve a desplegar. También se puede lanzar a mano en *Actions →
Desplegar Hall of Fame → Run workflow*. El resumen de la ejecución muestra la URL.

## Despliegue manual (alternativa con terminal)

Requisitos: Node 20+ y una cuenta de Cloudflare.

```bash
npm install
npx wrangler login

# 1. KV → copia el "id" que devuelve en wrangler.jsonc (kv_namespaces[0].id)
npx wrangler kv namespace create HOF_KV

# 2. Token de la integración de Notion (secret; nunca en el código)
npx wrangler secret put NOTION_TOKEN

# 3. (Opcional) token para forzar un refresco manual
npx wrangler secret put REFRESH_TOKEN

# 4. Desplegar
npm run deploy
```

**En Notion:** la integración tiene que tener acceso a las dos bases
(`•••` → *Connections* → tu integración) en **👥 CLIENTES** y en **🎖️ HALL OF FAME — Club 1%**.

Tras desplegar, abre la URL `*.workers.dev`: la primera visita dispara la sincronización
y en unos segundos aparece el ranking. Para forzar un refresco en cualquier momento:

```bash
curl -X POST -H "Authorization: Bearer $REFRESH_TOKEN" https://<tu-dominio>/api/refresh
```

### Dominio personalizado

No hay nada que tocar en el código: Dashboard de Cloudflare → *Workers & Pages* →
`sistema1-hall-of-fame` → *Settings* → *Domains & Routes* → *Add* → *Custom domain*
(p. ej. `halloffame.tudominio.com`). Cuando funcione, puedes poner `"workers_dev": false`
en `wrangler.jsonc` para desactivar la URL `workers.dev`.

## Configuración (`wrangler.jsonc` → `vars`)

| Variable | Valor | Qué hace |
|---|---|---|
| `NOTION_CLIENTES_DB` | `3bc5c30f46f480cf83afe40e2df24e1b` | ID de **base de datos** de Clientes (la API 2022-06-28 usa IDs de base, no el `collection://` del data source) |
| `NOTION_HOF_DB` | `9c767adba2194c48b8a95644a25e338e` | ID de base de datos de Hall of Fame |
| `MIN_MEDALS` | `0` | Mínimo de medallas para aparecer. Con `0` salen todos: quien aún no tiene medallas aparece en «En camino al 1%» |
| `NAME_FORMAT` | `full` | `first_initial` muestra «Laura G.» en lugar del nombre completo |

## Datos

- **Clientes**: `Nombre`, `Total Medallas Club` (fórmula), `Rango Hall of Fame` (fórmula).
  El rango **no se recalcula**: se usa el de Notion (tolera emojis/acentos).
- **Hall of Fame**: `Logro`, `Cliente`, `Categoría`, `Fecha`. Se lee la tabla entera en una
  consulta y se agrupa por cliente (evita 1 petición por cliente y el límite de 25 relaciones).
- **Fidelidad**: `Total Medallas Club − nº de logros` se muestra como «Fidelidad al Club 1% × N».
- **Siguiente rango** (1–2 Atleta 1% · 3–4 Atleta de Élite · 5–6 Leyenda 1% · 7+ Fundador 1%):
  «2 medallas más para Leyenda 1%» + anillo de progreso alrededor de la insignia.
- Empates: comparten posición (1, 2, 2, 4…) y se ordenan alfabéticamente.

## Imágenes propias (sin tocar código)

Sube la imagen a `public/medals/` (o `public/hero/` para el fondo del hero) y pon su ruta en
`public/config/assets.json`. Lo que quede en `null` usa la insignia circular de placeholder.
Detalles en [`public/medals/README.md`](public/medals/README.md).

## Desarrollo local

```bash
cp .dev.vars.example .dev.vars    # pon tu NOTION_TOKEN si quieres sincronizar de verdad
node scripts/make-sample.js       # genera datos de ejemplo
npm run seed:local                # los carga en el KV local
npm run dev                       # http://localhost:8787
# Cron local: curl "http://localhost:8787/__scheduled?cron=*/30+*+*+*+*"
npm test
```

## Estructura

```
src/index.js      Worker: fetch (página + /api) y scheduled (cron)
src/notion.js     Cliente mínimo de la API de Notion (paginación + reintentos 429)
src/transform.js  Notion → JSON del ranking (posiciones, rangos superados, progreso)
src/ranks.js      Umbrales de rango
public/           index.html · styles.css · app.js · config/assets.json · medals/ · hero/
```
