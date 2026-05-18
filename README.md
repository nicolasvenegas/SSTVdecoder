# 📑 Decodificador SSTV Estructural - Perfil PD120 (p5.js)

## 🚀 Descripción General
Esta aplicación web nativa, desarrollada sobre la librería **p5.js**, realiza la decodificación por software en cascada de señales de televisión de barrido lento (**SSTV**). El sistema procesa flujos de audio digitalizados (.wav) e implementa un algoritmo de conversión matemática cromática en tiempo real optimizado para el modo entrelazado **PD120**, dibujando de manera simultánea líneas paralelas basadas en la luminancia y crominancia de la señal.

El diseño cuenta con una arquitectura de interfaz de usuario totalmente **responsiva**, adaptándose dinámicamente según el tamaño del navegador para un flujo de trabajo cómodo tanto en pantallas de escritorio como portátiles.

---

## 🛠️ Especificaciones Técnicas del Perfil
* **Modo Soportado:** PD120 (Familia PD de SSTV).
* **Resolución de Imagen Nativa:** 640 x 496 píxeles exactos.
* **Frecuencia de Muestreo:** 48,000 Hz.
* **Tiempo por Píxel Base:** 0.000190 segundos.
* **Espacio de Color:** Conversión en caliente desde YUV (Y0, Y1, U, V) a RGB estándar.

---

## 🏗️ Flujo de Operación y Características Clave

### 1. Extracción Estricta del Origen (Metadatos)
Al cargar el archivo mediante el objeto nativo de p5.js (`createFileInput`), el decodificador extrae el nombre original del archivo de audio y sanitiza la cadena eliminando la extensión `.wav`. Este identificador queda almacenado de forma persistente para la posterior exportación.

### 2. Procesamiento de Frecuencias y Sincronismo
* **Detección de Pulsos:** Cruces por cero en el flujo binario del canal de audio.
* **Tonos de Sincronismo Lineal:** Rango de tolerancia estricto entre 1140 Hz y 1260 Hz para disparar el avance de líneas (`currentLine += 2`).
* **Rango de Video (Croma/Luma):** Espectro dinámico entre 1450 Hz y 2350 Hz mapeado linealmente a la escala de color (0-255).

### 3. Interfaz de Usuario Lateral Ajustable
* **Reloj (Hz):** Entrada numérica directa para corregir la inclinación o desalineación vertical (*slant*) recalculando las muestras por píxel.
* **Desfase (Muestras):** Ajuste fino para centrar horizontalmente la imagen y corregir desfases de sincronismo.
* **Balance Color (YUV):** Multiplicador para aumentar o disminuir la ganancia de saturación en los canales de crominancia U y V.

### 4. Layout Responsivo Automático (UI/UX)
* **Pantallas Grandes ($\geq$ 900px):** El menú de configuración se fija en la esquina superior izquierda de forma vertical y el Canvas se renderiza centrado de manera paralela con un desplazamiento de aire (`+120px`) a la derecha.
* **Pantallas Pequeñas (< 900px):** El lienzo de dibujo de la imagen se desplaza de forma automática **abajo del menú de control**, ganando un margen superior seguro para evitar colisiones y superposición de elementos DOM.

### 5. Exportación Segura de Datos
Se emplea la función nativa `save()` en memoria sobre el objeto `imgFinal`. Esto evita los errores comunes de sandbox del navegador y de `saveCanvas()`, garantizando la descarga de la matriz de píxeles limpia (640x496) sin capturar la interfaz gris de la aplicación ni los inputs del formulario.

---

## 📂 Formato de Guardado Automatizado
El archivo final de exportación genera un formato estructurado y predecible de marcas de tiempo forzadas a dos dígitos (`nf`):

`[NombreOriginalWAV]_[AAAAMMDD_HHMMSS]_PD120.png`

* **Ejemplo real de salida:** `captura_hf_radio_20260518_143302_PD120.png`

---

## 🔧 Requisitos de Ejecución
1. Alojar la estructura en un servidor local básico o entorno web.
2. Asegurar la llamada correcta a las librerías de p5.js y p5.sound.js.
