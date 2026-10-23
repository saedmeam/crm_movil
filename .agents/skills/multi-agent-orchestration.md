---
name: multi-agent-orchestration
description: Cómo desplegar y coordinar 10-15 subagentes especializados por tipo de tarea.
---

# Skill: MULTI-AGENT ORCHESTRATION

## Selección de subagentes

### Para BUGFIX (Reglas 1-11) -> 15 subagentes
Base (10) + variantes:
1. master_lead_agent
2. requirements_analyst (lectura del reporte)
3. software_architect (impacto arquitectónico)
4. database_specialist (datos implicados)
5. backend_developer
6. frontend_developer
7. qa_engineer
8. security_specialist
9. code_reviewer
10. git_devops_specialist
11. logs/trace analyst (lectura de logs reales)
12. domain-entity analyst
13. adapter/mapper analyst (contratos API)
14. http/error-handling analyst
15. regression analyst (línea base de pruebas)

### Para NUEVO DESARROLLO (Reglas 12-22) -> 10-15 subagentes
Los 10 roles base + especialistas por capa según el alcance (UI, API, DB, integración).

## Regla de consolidación
- Cada subagente reporta: hallazgos (archivo:línea), riesgos y recomendación.
- `master_lead_agent` consolida en un único plan y evita contradicciones.
- Ningún subagente puede afirmar sin evidencia (Reglas 4, 5, 15, 16).
