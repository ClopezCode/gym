import type { Exercise } from './exercise'

export type RoutineTemplate = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type RoutineTemplateItemRow = {
  id: string
  template_id: string
  exercise_id: string
  sort_order: number
}

export type RoutineTemplateWithExercises = RoutineTemplate & {
  items: Array<{ sort_order: number; exercise: Exercise }>
}
