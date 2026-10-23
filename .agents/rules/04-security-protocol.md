# Protocolo de Seguridad (OWASP Top 10 / Datos Médicos) — Reglas 6, 8, 11, 22

## Alcance
Datos clínicos de pacientes (PHI). Hallazgos DICOM, informes radiológicos, demografía.

## Controles obligatorios
- **A01 Broken Access Control**: respetar `src/config/permissions-manager.ts` y `ui-permissions.config.json`.
- **A02 Cryptographic Failures**: no exponer tokens. `tenant.config.json` contiene token de API — no imprimirlo en logs ni en respuestas.
- **A03 Injection**: parametrizar consultas; validar todo input de usuario (formularios de paciente, filtros de agenda).
- **A05 Security Misconfiguration**: no dejar debug activo; cabeceras correctas en `HttpClient`.
- **A07 Auth Failures**: revisar `auth.repository.ts`, `auth.service.ts`, manejo de sesión.
- **A09 Logging**: no registrar PHI ni tokens en claro.

## Privacidad
- No incluir datos identificables de pacientes en error handlers ni en mensajes de UI.
- No mencionar nombres de cliente/proveedor en código ni comentarios (Reglas 11 y 22).
