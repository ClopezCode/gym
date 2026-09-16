import { describe, expect, it } from 'vitest'
import {
  bestEstimatedOneRepMax,
  estimatedOneRepMax,
  formatEstimated1RM,
} from './estimatedOneRepMax'

describe('estimatedOneRepMax', () => {
  it('una repetición es el peso', () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100)
  })

  it('usa Epley para varias reps', () => {
    expect(estimatedOneRepMax(100, 5)).toBeCloseTo(100 * (1 + 5 / 30))
  })

  it('rechaza entradas inválidas', () => {
    expect(estimatedOneRepMax(-1, 5)).toBeNull()
    expect(estimatedOneRepMax(100, 0)).toBeNull()
  })
})

describe('bestEstimatedOneRepMax', () => {
  it('elige la serie con mayor 1RM estimado', () => {
    const best = bestEstimatedOneRepMax([
      { weight: 60, reps: 10 },
      { weight: 100, reps: 1 },
      { weight: 80, reps: 5 },
    ])
    expect(best).toBe(100)
  })

  it('devuelve null si no hay series válidas', () => {
    expect(bestEstimatedOneRepMax([])).toBeNull()
  })
})

describe('formatEstimated1RM', () => {
  it('redondea a kg enteros', () => {
    expect(formatEstimated1RM(116.6)).toBe('117 kg')
    expect(formatEstimated1RM(null)).toBe('—')
  })
})
