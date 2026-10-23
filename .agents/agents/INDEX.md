# Índice de la Matriz de Agentes (10 Agentes Especializados)

| # | Agente | Archivo | Rol | Reglas |
| :---: | :--- | :--- | :--- | :--- |
| 1 | master_lead_agent | `master_lead_agent.md` | Director Técnico / Orquestación | Todas |
| 2 | requirements_analyst | `requirements_analyst.md` | Requerimientos & Gherkin | 1,2,4,5,12,13,15,16 |
| 3 | software_architect | `software_architect.md` | Clean Architecture & Contratos | 6,7,8,17,18,19 |
| 4 | database_specialist | `database_specialist.md` | BD, SQL y Optimización | 6,7,8,17,18,19 |
| 5 | backend_developer | `backend_developer.md` | Backend, servicios y DTOs | 6,7,8,9,17,18,19,20 |
| 6 | frontend_developer | `frontend_developer.md` | UI/UX y consumo de APIs | 6,7,8,9,17,18,19,20,22 |
| 7 | qa_engineer | `qa_engineer.md` | Pruebas y No-Regresión | 6,8,9,17,19,20 |
| 8 | security_specialist | `security_specialist.md` | OWASP & Protección de PHI | 6,8,11,17,19,22 |
| 9 | code_reviewer | `code_reviewer.md` | Calidad, SOLID, Clean Code | 6,7,8,11,17,18,19,22 |
| 10 | git_devops_specialist | `git_devops_specialist.md` | Git/CI-CD y Bloqueo de Push | 10,21 |

## Instanciación
- BUGFIX/HOTFIX (Reglas 1–11): desplegar 15 subagentes (los 10 roles + variantes especializadas por capa).
- NUEVO DESARROLLO (Reglas 12–22): desplegar entre 10 y 15 subagentes.
- Orquestación obligatoria vía `master_lead_agent` (ver `../rules/05-pipeline-orchestration.md`).
