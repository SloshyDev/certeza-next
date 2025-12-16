# Guía de estilos (Tailwind CSS)

## Filosofía

- Utilidades-first con clases de Tailwind para layout, tipografía y espaciado.
- Tokens en `:root` para colores y tipografía; `darkMode: "class"`.
- Componentes reutilizables con `@apply` solo cuando aporta consistencia.

## Configuración

- Breakpoints: `sm (640)`, `md (768)`, `lg (1024)`, `xl (1280)`, `2xl (1536)`, `3xl (1920)`, `4xl (2560)`.
- Colores: `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `border`.

## Patrones

- Contenedor: `container-responsive max-w-screen-4xl`.
- Tipografía base: `h1` y `p` definidos en `@layer base`.
- Botones:
  - Primario: `btn-primary`
  - Secundario: `btn-secondary`

## Accesibilidad

- Contraste mínimo AA entre `foreground` y `background`.
- Tamaños de texto mínimos: `text-base` en párrafos, `text-3xl` en `h1`.
- Estados de foco: usa `focus-visible:outline` si se requiere, p.ej. `focus-visible:outline-2`.

## Temas

- Activa/desactiva con `document.documentElement.classList.toggle("dark")`.
- No uses `prefers-color-scheme` para sincronizar; el control es por clase.

## Responsive

- Mobile-first: compón clase base y añade variantes `sm:`, `md:`, `lg:` según necesidad.
- Usa `max-w-screen-*` para limitar ancho en desktop y evitar líneas demasiado largas.

## Animaciones

- Usa `transition-colors duration-200 ease-soft` para transiciones suaves.
- Evita animaciones intrusivas; prioriza cambios de color/opacidad.

## Rendimiento

- Purge automático por `content` en `tailwind.config.js`.
- Evita clases dinámicas construidas en runtime que Tailwind no pueda detectar.

## Testing

- Ejecuta Lighthouse y verifica accesibilidad y responsive.
- Prueba en Chrome, Safari, Firefox, Edge; distintos iPhone/Android.
- Revisa visualmente componentes clave (.btn, inputs, grids) en `sm→4xl`.
