# Horustech CRM Móvil (Android & iOS)

Aplicación móvil oficial de **Horustech CRM** desarrollada con **Expo (SDK 52+), React Native y TypeScript**, diseñada para gestión de mensajería empresarial de alto rendimiento con experiencia estilo WhatsApp.

---

## 🚀 Características Principales

- **Conexión en Red Local y Producción:** Conexión a `http://192.168.100.188:4001` (configurable vía variable `EXPO_PUBLIC_API_URL` en `.env`).
- **Autenticación Segura:**
  - Persistencia con `expo-secure-store`.
  - Cierre de sesión automático ante código `401 Unauthorized`.
  - Alerta en pantalla sin cierre de sesión ante código `403 Forbidden`.
- **Mensajería en Tiempo Real (Socket.IO):**
  - Reconexión automática con autenticación por Bearer Token.
  - Suscripción automática a la sala personal `user:{userId}`.
  - Actualización reactiva de mensajes entrantes (`new_message`) y ticks de lectura (`message_status_update`).
- **Pantalla de Chats estilo WhatsApp:**
  - Lista virtualizada ultrarrápida con `@shopify/flash-list`.
  - Filtros: *Todos*, *No leídos*, *Mis Chats*.
  - Buscador predictivo por nombre, número de teléfono o empresa.
  - Indicador de estado de conexión (*En línea* / *Conectando*).
- **Chat Individual:**
  - Burbuja verde (`#D9FDD3`) para agente con doble check azul de leído.
  - Burbuja blanca para cliente.
  - Distintivo para **Notas Internas del Equipo** (fondo amarillo claro con aviso de privacidad).
  - Reproductor integrado de **notas de voz** con progreso y duración.
  - Grabación de notas de voz en alta calidad con `expo-av`.
  - Envío y captura de fotografías con `expo-image-picker` y compresión previa al envío.
  - Visor modal de fotos a pantalla completa con opción de compartir.

---

## 🛠️ Comandos de Desarrollo

```bash
# Iniciar servidor Expo en modo túnel o LAN
npx expo start

# Ejecutar en Android (emulador o dispositivo conectado por USB)
npx expo start --android

# Verificar tipado de TypeScript
npx tsc --noEmit
```

---

## 📦 Compilación de APK y Tiendas (EAS Build)

El proyecto incluye `eas.json` configurado:

```bash
# 1. Compilar APK directo para pruebas en tu teléfono:
npx eas-cli build -p android --profile preview

# 2. Compilar AAB para Google Play Store:
npx eas-cli build -p android --profile production

# 3. Compilar para iOS App Store:
npx eas-cli build -p ios --profile production
```
