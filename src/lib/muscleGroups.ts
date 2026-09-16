export const MUSCLE_GROUPS = [
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
  'full_body',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

const LABELS: Record<MuscleGroup, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps',
  isquios: 'Isquios',
  gluteos: 'Glúteos',
  gemelos: 'Gemelos',
  core: 'Core',
  full_body: 'Full body',
}

export function isMuscleGroup(value: string): value is MuscleGroup {
  return (MUSCLE_GROUPS as readonly string[]).includes(value)
}

export function muscleGroupLabel(group: MuscleGroup | null | undefined): string {
  if (!group || !isMuscleGroup(group)) return '—'
  return LABELS[group]
}
