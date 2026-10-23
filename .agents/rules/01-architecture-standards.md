# Estándares de Arquitectura y Código (ris-pacs-core)

Derivado de `ARCHITECTURE.md` y de las Reglas 6, 7, 8, 17, 18, 19.

## Clean Architecture (dependencias hacia adentro)
```
4. PRESENTACION    -> src/presentation/
3. APLICACION      -> src/application/services/
1. DOMINIO         -> src/domain/entities/  +  src/domain/ports/
2. INFRAESTRUCTURA -> src/infrastructure/
```
- **Dominio**: entidades puras y puertos (interfaces). Sin librerías externas.
- **Aplicación**: casos de uso / servicios. Depende solo de puertos del dominio.
- **Infraestructura**: adaptadores, DTOs, mappers, `provider-factory.ts`. Implementa los puertos.
- **Prohibido**: importar infraestructura desde dominio o aplicación; romper la dirección de dependencias.

## Reglas de implementación
- **TypeScript estricto**. Sin `any` injustificado. Tipado fuerte en DTOs, mappers y entidades.
- **Puertos/Contratos primero**: un proveedor nuevo se integra creando DTOs -> Mappers -> Adapters que implementen `src/domain/ports/*`.
- **ProviderFactory** como única puerta de inyección de repositorios.
- **Result<T, E>** (`src/shared/types/result.type.ts`) para control funcional de errores en servicios.
- **Configuración parametrizada** en `src/config/tenant.config.json` y `app.config.ts`. No hardcodear URLs ni tokens.
- **Utilidades compartidas** en `src/shared/utils` y catálogos en `src/shared/constants`.
- **HL7**: `Accession Number` máximo 16 caracteres; fechas `YYYYMMDDHHmm`.
- **Asignación por área**: `ImagingAssignmentService` valida Procedimiento -> Modalidad -> Estación y bloquea asignaciones inválidas.

## Convenciones de comentarios (Reglas 11 y 22)
- Descriptivos, objetivos, directos, funcionales y de negocio.
- **Prohibido** mencionar nombres de cliente o proveedor.

## Comandos de verificación del proyecto
```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run test           # node src/tests/run-all-tests.js
npm run test:vitest    # vitest run
npm run build          # tsc && vite build
```
