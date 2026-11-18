# Slotcars Landing

Landing page de Slotcars: pistas de autos a control remoto para eventos.

Stack: Astro, GSAP (ScrollTrigger), Lenis.

## Comandos

| Comando | Acción |
|---|---|
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor de desarrollo en http://localhost:4321 |
| `npm run build` | Genera el sitio estático en `dist/` |
| `npm run preview` | Sirve el build localmente |

## Estructura

- `src/layouts/Base.astro`: HTML base.
- `src/pages/index.astro`: la landing.
- `src/scripts/parallax.ts`: parallax, smooth scroll y animaciones.
- `public/`: archivos estáticos (imágenes, favicon, robots.txt).

## Variables de entorno

Copiar `.env.example` a `.env`. No subir `.env` al repo.
