-- Grupos musculares, RPE, descanso, notas, duración, catálogo global.
-- Actualiza RLS para permitir ejercicios con user_id IS NULL y replace_workout_sets.

-- ---------------------------------------------------------------------------
-- exercises.muscle_group
-- ---------------------------------------------------------------------------
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS muscle_group text;

UPDATE public.exercises
SET muscle_group = 'full_body'
WHERE muscle_group IS NULL;

ALTER TABLE public.exercises
  ALTER COLUMN muscle_group SET DEFAULT 'full_body';

ALTER TABLE public.exercises
  ALTER COLUMN muscle_group SET NOT NULL;

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_muscle_group_check;

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_muscle_group_check
  CHECK (
    muscle_group IN (
      'pecho',
      'espalda',
      'hombros',
      'biceps',
      'triceps',
      'cuadriceps',
      'isquios',
      'gluteos',
      'gemelos',
      'core',
      'full_body'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS exercises_global_name_lower
  ON public.exercises (lower(name))
  WHERE user_id IS NULL;

-- ---------------------------------------------------------------------------
-- sets: RPE y descanso
-- ---------------------------------------------------------------------------
ALTER TABLE public.sets
  ADD COLUMN IF NOT EXISTS rpe numeric(3, 1);

ALTER TABLE public.sets
  ADD COLUMN IF NOT EXISTS rest_seconds integer;

ALTER TABLE public.sets
  DROP CONSTRAINT IF EXISTS sets_rpe_check;

ALTER TABLE public.sets
  ADD CONSTRAINT sets_rpe_check
  CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));

ALTER TABLE public.sets
  DROP CONSTRAINT IF EXISTS sets_rest_seconds_check;

ALTER TABLE public.sets
  ADD CONSTRAINT sets_rest_seconds_check
  CHECK (rest_seconds IS NULL OR rest_seconds >= 0);

-- ---------------------------------------------------------------------------
-- workouts: notas y duración
-- ---------------------------------------------------------------------------
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

UPDATE public.workouts
SET started_at = created_at
WHERE started_at IS NULL;

ALTER TABLE public.workouts
  ALTER COLUMN started_at SET DEFAULT now();

-- ---------------------------------------------------------------------------
-- RLS exercises: ver propios + catálogo global; mutar solo propios
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS exercises_select_own ON public.exercises;
CREATE POLICY exercises_select_own ON public.exercises
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS exercises_insert_own ON public.exercises;
CREATE POLICY exercises_insert_own ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS exercises_update_own ON public.exercises;
CREATE POLICY exercises_update_own ON public.exercises
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS exercises_delete_own ON public.exercises;
CREATE POLICY exercises_delete_own ON public.exercises
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS sets: ejercicios propios o del catálogo
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sets_insert_own_workout ON public.sets;
CREATE POLICY sets_insert_own_workout ON public.sets
  FOR INSERT TO authenticated
  WITH CHECK (
    workout_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = sets.workout_id AND w.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = sets.exercise_id
        AND (e.user_id = auth.uid() OR e.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS sets_update_own_workout ON public.sets;
CREATE POLICY sets_update_own_workout ON public.sets
  FOR UPDATE TO authenticated
  USING (
    workout_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = sets.workout_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workout_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = sets.workout_id AND w.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = sets.exercise_id
        AND (e.user_id = auth.uid() OR e.user_id IS NULL)
    )
  );

-- ---------------------------------------------------------------------------
-- RLS plantillas: items pueden apuntar al catálogo
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS routine_template_items_insert_own ON public.routine_template_items;
CREATE POLICY routine_template_items_insert_own ON public.routine_template_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routine_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND (e.user_id = auth.uid() OR e.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS routine_template_items_update_own ON public.routine_template_items;
CREATE POLICY routine_template_items_update_own ON public.routine_template_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routine_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routine_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND (e.user_id = auth.uid() OR e.user_id IS NULL)
    )
  );

-- ---------------------------------------------------------------------------
-- RPC replace_workout_sets (RPE, rest, catálogo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_workout_sets(
  p_workout_id uuid,
  p_sets jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = p_workout_id AND w.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'workout_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_sets IS NOT NULL AND jsonb_typeof(p_sets) <> 'array' THEN
    RAISE EXCEPTION 'p_sets_must_be_json_array' USING ERRCODE = '22000';
  END IF;

  IF p_sets IS NOT NULL AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_sets) AS elem
    WHERE NOT EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = (elem->>'exercise_id')::uuid
        AND (e.user_id = auth.uid() OR e.user_id IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'exercise_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.sets WHERE workout_id = p_workout_id;

  IF p_sets IS NULL OR jsonb_array_length(p_sets) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.sets (
    workout_id,
    exercise_id,
    weight,
    reps,
    rpe,
    rest_seconds
  )
  SELECT
    p_workout_id,
    (elem->>'exercise_id')::uuid,
    (elem->>'weight')::numeric,
    (elem->>'reps')::int,
    NULLIF(elem->>'rpe', '')::numeric,
    NULLIF(elem->>'rest_seconds', '')::int
  FROM jsonb_array_elements(p_sets) AS elem;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.replace_workout_sets(uuid, jsonb) IS
  'Borra todas las series del workout del usuario e inserta p_sets (peso, reps, RPE, descanso) en una transacción.';

-- ---------------------------------------------------------------------------
-- Catálogo global (idempotente por nombre)
-- ---------------------------------------------------------------------------
INSERT INTO public.exercises (name, user_id, muscle_group)
SELECT v.name, NULL, v.muscle_group
FROM (
  VALUES
    ('Press banca', 'pecho'),
    ('Press banca inclinado', 'pecho'),
    ('Aperturas', 'pecho'),
    ('Fondos', 'pecho'),
    ('Dominadas', 'espalda'),
    ('Remo con barra', 'espalda'),
    ('Remo con mancuerna', 'espalda'),
    ('Jalón al pecho', 'espalda'),
    ('Peso muerto', 'espalda'),
    ('Press militar', 'hombros'),
    ('Elevaciones laterales', 'hombros'),
    ('Pájaros', 'hombros'),
    ('Curl con barra', 'biceps'),
    ('Curl martillo', 'biceps'),
    ('Press francés', 'triceps'),
    ('Extensiones en polea', 'triceps'),
    ('Sentadilla', 'cuadriceps'),
    ('Prensa', 'cuadriceps'),
    ('Zancadas', 'cuadriceps'),
    ('Extensiones de cuádriceps', 'cuadriceps'),
    ('Peso muerto rumano', 'isquios'),
    ('Curl femoral', 'isquios'),
    ('Hip thrust', 'gluteos'),
    ('Puente de glúteos', 'gluteos'),
    ('Elevaciones de gemelos', 'gemelos'),
    ('Plancha', 'core'),
    ('Crunch', 'core'),
    ('Elevaciones de piernas', 'core'),
    ('Burpees', 'full_body'),
    ('Swing con kettlebell', 'full_body')
) AS v(name, muscle_group)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.exercises e
  WHERE e.user_id IS NULL
    AND lower(e.name) = lower(v.name)
);
