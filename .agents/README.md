# .agents — Sistema Multi-Agente (ris-pacs-core)

Estructura unificada y estable que instancia las **22 Reglas Inmutables** y la **Matriz de 10 Agentes**
para cualquier IDE o motor de IA (Cursor, Windsurf/Cascade, Claude Code, Gemini/Antigravity, Codex).

```
.agents/
├── README.md                      # este archivo
├── rules/                         # Directrices (.md)
│   ├── 00-immutable-rules.md      # Las 22 Reglas Inmutables
│   ├── 01-architecture-standards.md
│   ├── 02-git-protocol.md         # Bloqueo de commit/push
│   ├── 03-testing-protocol.md     # Pruebas y no-regresión
│   ├── 04-security-protocol.md    # OWASP / datos médicos
│   └── 05-pipeline-orchestration.md
├── agents/                        # Matriz de 10 subagentes (.md, tool-agnostic)
│   ├── INDEX.md
│   ├── master_lead_agent.md
│   ├── requirements_analyst.md
│   ├── software_architect.md
│   ├── database_specialist.md
│   ├── backend_developer.md
│   ├── frontend_developer.md
│   ├── qa_engineer.md
│   ├── security_specialist.md
│   ├── code_reviewer.md
│   └── git_devops_specialist.md
└── skills/                        # Habilidades y flujos de trabajo
    ├── INDEX.md
    ├── bugfix-hotfix.md
    ├── new-feature-development.md
    ├── multi-agent-orchestration.md
    └── release-and-git-gate.md
```

## Instanciación por herramienta

| Herramienta | Archivo de contexto |
| :--- | :--- |
| Cursor | `.cursorrules` y `.cursor/rules/agents.mdc` |
| Windsurf / Cascade | `.windsurfrules` |
| Claude Code | `CLAUDE.md` |
| Gemini / Antigravity | `GEMINI.md` (y lectura nativa de `./AGENTS.md`) |
| Codex | `.codex/agents/*.toml` (+ `docs/codex-agents.md`) |

Todas las herramientas referencian esta carpeta `.agents/` y `./AGENTS.md` como fuentes de verdad.

## Principios
1. **Single source of truth**: `./AGENTS.md`. Esta carpeta es la copia operativa modular.
2. **Sin divergencia**: los roles de `.agents/agents/` y `.codex/agents/` describen los mismos 10 agentes.
3. **Estabilidad**: los archivos son fijos; solo cambian por decisión explícita del usuario.
