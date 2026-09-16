# Supabase (gym-tracker)

## Migraciones

Los SQL viven en `migrations/`. Incluyen **RLS** en `workouts`, `exercises`, `sets`, la función **`replace_workout_sets`**, plantillas de rutina, **catálogo global**, RPE, descanso, notas y duración.

### Aplicar cambios

**Opción A — Supabase CLI** (recomendado si ya tenés el proyecto linkeado):

```bash
supabase db push
```

**Opción B — Editor SQL** en el dashboard de Supabase:

1. Abrí **SQL** → **New query**.
2. Ejecutá **en orden** cada archivo de `migrations/` que aún no aplicaste (por fecha en el nombre), por ejemplo:
   - `20260404140000_rls_and_replace_workout_sets.sql`
   - `20260404180000_routine_templates.sql`
   - `20260916120000_session_catalog_calendar.sql`

### Notas

- Las políticas usan el rol **`authenticated`** (sesión con JWT de Supabase Auth), coherente con el cliente anon key + login.
- Si ya tenías políticas con otros nombres, revisá conflictos antes de ejecutar (este script hace `DROP POLICY IF EXISTS` solo de los nombres definidos aquí).
- Ejercicios **propios o del catálogo** (`user_id` null) se pueden usar en `sets` y plantillas. El catálogo no se edita desde el cliente.
