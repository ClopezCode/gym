/**
 * Tipos de dominio y, más adelante, tipos generados de Supabase
 * (`supabase gen types typescript --project-id ...`).
 */
export type { Exercise } from './exercise'
export type { ExerciseSetHistoryEntry } from './exercisePerformance'
export type {
  LocalSessionSet,
  SessionExercise,
} from './workoutSession'
export type { WorkoutSetRow, WorkoutSetWithExercise } from './workoutSet'
export type {
  RoutineTemplate,
  RoutineTemplateItemRow,
  RoutineTemplateWithExercises,
} from './routineTemplate'
export type { Workout } from './workout'
