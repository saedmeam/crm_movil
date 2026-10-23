# Pipeline de 7 Fases — Orquestación Multi-Agente (master_lead_agent)

## Fases
1. **INTAKE** - Triage de insumos (logs, capturas, HUs, trazas). Identificar si es BUGFIX (Bloque 1) o NUEVO DESARROLLO (Bloque 2).
2. **RECONOCIMIENTO** - Lectura real del código, arquitectura y contratos afectados. Sin suposiciones.
3. **ANÁLISIS ESPECIALIZADO** - Despliegue de 10–15 subagentes en paralelo (matriz de `.agents/agents/`).
4. **DISEÑO** - Contratos, interfaces, DTOs/mappers, plan de no-regresión.
5. **IMPLEMENTACIÓN** - Código respetando Clean Architecture y convenciones.
6. **VALIDACIÓN** - Pruebas (typecheck, test, vitest, lint) + revisión de seguridad y calidad.
7. **ENTREGA** - Reporte de evidencia. Commit/push SOLO con autorización del usuario.

## Reglas duras del pipeline
- BUGFIX => exactamente 15 subagentes (Regla 3).
- NUEVO DESARROLLO => entre 10 y 15 subagentes (Regla 14).
- Cualquier fase puede retroceder si faltan insumos (Regla 4/15: no asumir).
- Un fallo de regresión en Fase 6 detiene todo (Reglas 6/17).

## DoD (Definition of Done)
- [ ] typecheck OK, tests OK, lint OK.
- [ ] Sin regresiones respecto a la línea base.
- [ ] Sin comentarios con nombres de cliente/proveedor.
- [ ] Evidencia de pruebas presentada al usuario.
- [ ] Git bloqueado hasta autorización.
