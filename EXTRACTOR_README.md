# 📄 Extractor de PDFs - Integración

## 🚀 Configuración

### 1. Iniciar el Servidor API

En el directorio `PDF_READER`:

```bash
cd c:\Users\devln\Desktop\PDF_READER
python api.py
```

El servidor API estará disponible en: `http://localhost:8000`

### 2. Configurar Variables de Entorno

El archivo `.env.local` ya está configurado con:

```env
NEXT_PUBLIC_PDF_API_URL=http://localhost:8000
```

### 3. Iniciar la Aplicación Next.js

En el directorio `certeza-next`:

```bash
npm run dev
```

### 4. Acceder al Extractor

Abre tu navegador en: `http://localhost:3000/extractor`

## 📋 Uso

1. **Selecciona una plantilla** del menú desplegable
2. **Carga un archivo PDF** haciendo clic en el botón de selección
3. **Haz clic en "Extraer Datos"** para procesar el PDF
4. **Edita los campos** según sea necesario
5. **Guarda los datos** (implementar lógica de guardado)

## 🔧 Personalización

### Guardar en Base de Datos

Modifica la función `handleSave` en `src/app/extractor/page.js`:

```javascript
const handleSave = async () => {
  try {
    const response = await fetch("/api/polizas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      alert("✅ Datos guardados correctamente");
      handleReset();
    }
  } catch (error) {
    alert("❌ Error al guardar: " + error.message);
  }
};
```

### Agregar al Menú de Navegación

Si tienes un menú lateral, agrega:

```jsx
<Link href="/extractor">📄 Extractor PDFs</Link>
```

## 🎨 Características

- ✅ Carga de archivos PDF drag & drop
- ✅ Selección de plantillas dinámicas
- ✅ Formulario editable con todos los campos
- ✅ Organización por categorías
- ✅ Diseño responsive
- ✅ Estadísticas de extracción
- ✅ Validación de datos
- ✅ Normalización automática de fechas
- ✅ Soporte para campos múltiples (direcciones)

## 🔒 Seguridad en Producción

1. **Configurar CORS** en `api.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tu-dominio.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. **Usar HTTPS** para la API en producción
3. **Agregar autenticación** si es necesario
4. **Validar permisos** del usuario antes de permitir extracción

## 📝 Notas

- La página usa "use client" porque necesita interactividad del lado del cliente
- Los datos se mantienen en el estado local hasta que se guardan
- La API procesa PDFs sin guardarlos en el servidor
- Las plantillas se cargan desde `templates.json` en el servidor API
