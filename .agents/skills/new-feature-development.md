---
name: new-feature-development
description: Flujo incondicional para nuevos desarrollos, HUs, endpoints, vistas o integraciones siguiendo el Bloque 2 (Reglas 12-22) con 10-15 subagentes.
---

# Skill: NUEVO DESARROLLO / HU

## Disparador
Nueva funcionalidad, módulo, HU, endpoint, vista o integración.

## Pasos obligatorios
1. **Intake de insumos**: recopilar HU, adjuntos, especificaciones, contratos (Reglas 12, 13).
2. **Criterios de aceptación Gherkin** y matriz de trazabilidad (`requirements_analyst`).
3. **Despliegue de 10–15 subagentes** (Regla 14).
4. **Diseño de arquitectura y contratos** (`software_architect`) sin romper nada (Reglas 17, 18).
5. **Implementación por capas**: dominio -> aplicación -> infraestructura -> presentación.
6. **Evidencia real**: todo diseño responde a especificaciones validadas (Reglas 15, 16).
7. **Pruebas del agente** (Regla 20) + verificación de no-regresión (Regla 17, 19).
8. **Revisión de seguridad y calidad** (`security_specialist`, `code_reviewer`).
9. **Reporte al usuario** con evidencia. Pedir prueba local.
10. **Git bloqueado** hasta autorización (Regla 21).
11. **Comentarios limpios** (Regla 22).

## Salida esperada
- Especificación y criterios Gherkin.
- Plan de implementación por capas.
- Código + pruebas.
- Reporte de no-regresión.
- Petición de confirmación local.
