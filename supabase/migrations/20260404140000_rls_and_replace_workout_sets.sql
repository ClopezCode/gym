-- RLS para workouts / exercises / sets (rol authenticated)
-- Función atómica replace_workout_sets: DELETE + INSERT de series en una transacción

-- ---------------------------------------------------------------------------
-- workouts
-- ---------------------------------------------------------------------------
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workouts_select_own ON public.workouts;
DROP POLICY IF EXISTS workouts_insert_own ON public.workouts;
DROP POLICY IF EXISTS workouts_update_own ON public.workouts;
DROP POLICY IF EXISTS workouts_delete_own ON public.workouts;

CREATE POLICY workouts_select_own ON public.workouts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY workouts_insert_own ON public.workouts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY workouts_update_own ON public.workouts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY workouts_delete_own ON public.workouts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------------------
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exercises_select_own ON public.exercises;
DROP POLICY IF EXISTS exercises_insert_own ON public.exercises;
DROP POLICY IF EXISTS exercises_update_own ON public.exercises;
DROP POLICY IF EXISTS exercises_delete_own ON public.exercises;

CREATE POLICY exercises_select_own ON public.exercises
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY exercises_insert_own ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY exercises_update_own ON public.exercises
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY exercises_delete_own ON public.exercises
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- sets
-- ---------------------------------------------------------------------------
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sets_select_own_workout ON public.sets;
DROP POLICY IF EXISTS sets_insert_own_workout ON public.sets;
DROP POLICY IF EXISTS sets_update_own_workout ON public.sets;
DROP POLICY IF EXISTS sets_delete_own_workout ON public.sets;

CREATE POLICY sets_select_own_workout ON public.sets
  FOR SELECT TO authenticated
  USING (
    workout_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = sets.workout_id AND w.user_id = auth.uid()
    )
  );

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
      WHERE e.id = sets.exercise_id AND e.user_id = auth.uid()
    )
  );

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
      WHERE e.id = sets.exercise_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY sets_delete_own_workout ON public.sets
  FOR DELETE TO authenticated
  USING (
    workout_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = sets.workout_id AND w.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Reemplazo atómico de series (una transacción; rollback si falla el insert)
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
        AND e.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'exercise_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.sets WHERE workout_id = p_workout_id;

  IF p_sets IS NULL OR jsonb_array_length(p_sets) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.sets (workout_id, exercise_id, weight, reps)
  SELECT
    p_workout_id,
    (elem->>'exercise_id')::uuid,
    (elem->>'weight')::numeric,
    (elem->>'reps')::int
  FROM jsonb_array_elements(p_sets) AS elem;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_workout_sets(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_workout_sets(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.replace_workout_sets(uuid, jsonb) IS
  'Borra todas las series del workout del usuario e inserta p_sets en una sola transacción.';
