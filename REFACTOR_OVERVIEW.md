# Refactorización de Frontend - Certeza App

Este documento detalla los cambios realizados durante la refactorización de la página principal (`src/app/page.js`) y componentes relacionados, con el objetivo de mejorar la escalabilidad, mantenibilidad y consistencia del código.

## Cambios Realizados

### 1. Extracción de Componentes
Se han descompuesto los componentes monolíticos que residían en `src/app/page.js` hacia archivos independientes y reutilizables:

- **`src/components/charts/PieChart.jsx`**: Componente SVG puro para gráficos circulares. Se ha extraído la lógica de dibujo SVG para ser reutilizable.
- **`src/components/charts/EmisorCharts.jsx`**: Componente encargado de visualizar las estadísticas por emisor. Ahora utiliza `PieChart` internamente y maneja su propia lógica de agrupación de datos.
- **`src/components/charts/SeriesChartsClient.jsx`**: Se ha estandarizado el uso de constantes en este componente existente.

### 2. Centralización de Constantes
Se ha creado un archivo de configuración para constantes de visualización, eliminando la duplicación de paletas de colores y códigos hexadecimales hardcodeados.

- **`src/lib/chart-constants.js`**: Contiene `CHART_PALETTE` y `TYPE_COLORS`. Esto facilita cambios globales en la identidad visual de los gráficos.

### 3. Limpieza de `src/app/page.js`
El archivo principal de la página se ha reducido significativamente (~300 líneas menos), enfocándose ahora exclusivamente en:
- Autenticación y control de sesión.
- Obtención de datos del servidor (Server Component).
- Lógica de parámetros de URL y filtrado.
- Layout principal.

### 4. Estandarización
- Se han eliminado definiciones duplicadas de colores.
- Se ha unificado la forma en que los componentes de gráficos reciben datos y configuración.

## Roadmap de Escalabilidad

A continuación se presenta un plan para continuar mejorando la escalabilidad del frontend:

### Fase 1: Optimización de Componentes (Completado Parcialmente)
- [x] Desacoplar componentes de gráficos de `page.js`.
- [x] Centralizar constantes de diseño.
- [ ] Implementar `React.memo` en componentes de gráficos intensivos si se observa lag en interacciones.
- [ ] Mejorar la accesibilidad (A11y) de los gráficos SVG añadiendo descripciones y roles más detallados.

### Fase 2: Gestión de Estado y Datos
- [ ] Evaluar si la lógica de filtrado (actualmente en URL/Server) debe moverse parcialmente al cliente para interacciones más rápidas, manteniendo la sincronización con la URL.
- [ ] Implementar un hook personalizado `useBitacoraStats` si la lógica de obtención de datos se reutiliza en otras páginas.

### Fase 3: Rendimiento
- [ ] Implementar Code Splitting más agresivo si los componentes de gráficos crecen en tamaño.
- [ ] Añadir esqueletos de carga (Skeletons) mientras se obtienen los datos del servidor para mejorar el CLS (Cumulative Layout Shift).

### Fase 4: Testing
- [ ] Añadir pruebas unitarias para `PieChart` y `EmisorCharts` asegurando que renderizan correctamente con datos vacíos o parciales.
- [ ] Añadir pruebas de integración para el flujo de filtrado en `page.js`.
