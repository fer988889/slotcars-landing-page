# Slotcars Landing

Landing page de Slotcars: pistas de autos a control remoto para eventos.

Stack: Astro, GSAP, Lenis.

## Comandos

| Comando | Acción |
|---|---|
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor de desarrollo en http://localhost:4321 |
| `npm run build` | Genera el sitio estático en `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run compress-videos` | Comprime los videos nuevos de `public/videos/` y genera sus invertidos |

## Estructura

- `src/layouts/Base.astro`: HTML base.
- `src/pages/index.astro`: arma la landing (qué video va en cada sección).
- `src/scripts/main.ts`: punto de entrada (scroll suave + videos).
- `src/components/VideoStory.astro`: historia de la landing con videos que avanzan con el scroll.
- `src/components/StoryPanel.astro`: cada parada de esa historia.
- `src/components/sections/`: contenido de cada sección (Hero, Cómo funciona, Todo incluido, Testimonios, Contacto).
- `src/scripts/video-story/`: lógica de los videos. Ajustes en `config.ts`.
- `src/types/`: interfaces y tipos (`video-story.ts` para la historia con videos, `layout.ts` para el layout).
- `public/videos/`: videos de la landing.
- `public/`: archivos estáticos (imágenes, favicon, robots.txt).

## Variables de entorno

Copiar `.env.example` a `.env`. No subir `.env` al repo.
