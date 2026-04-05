# Supabase (gym-tracker)

## Migraciones

Los SQL viven en `migrations/`. Incluyen **RLS** en `workouts`, `exercises`, `sets`, la función **`replace_workout_sets`** (guardado atómico de series) y las tablas **`routine_templates` / `routine_template_items`** (plantillas de rutina) con RLS.

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

### Notas

- Las políticas usan el rol **`authenticated`** (sesión con JWT de Supabase Auth), coherente con el cliente anon key + login.
- Si ya tenías políticas con otros nombres, revisá conflictos antes de ejecutar (este script hace `DROP POLICY IF EXISTS` solo de los nombres definidos aquí).
- Ejercicios con `user_id` distinto del usuario actual no pueden usarse en `sets` (validación en RLS y en la función).
