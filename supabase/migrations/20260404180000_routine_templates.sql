-- Plantillas de rutina: lista reutilizable de ejercicios por usuario

CREATE TABLE public.routine_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.routine_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.routine_templates (id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (template_id, exercise_id)
);

CREATE INDEX idx_routine_template_items_template_id
  ON public.routine_template_items (template_id);

ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_template_items ENABLE ROW LEVEL SECURITY;

-- routine_templates
CREATE POLICY routine_templates_select_own ON public.routine_templates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY routine_templates_insert_own ON public.routine_templates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY routine_templates_update_own ON public.routine_templates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY routine_templates_delete_own ON public.routine_templates
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- routine_template_items
CREATE POLICY routine_template_items_select_own ON public.routine_template_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routine_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY routine_template_items_insert_own ON public.routine_template_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routine_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id AND e.user_id = auth.uid()
    )
  );

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
      WHERE e.id = exercise_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY routine_template_items_delete_own ON public.routine_template_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routine_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  );
