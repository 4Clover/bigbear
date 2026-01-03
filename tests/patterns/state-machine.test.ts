import { describe, it, expect } from 'vitest'

/**
 * Generic state machine pattern tests.
 * These validate state transition logic for entities like:
 * - Booking status (PENDING → CONFIRMED → COMPLETED)
 * - Maintenance job status (OPEN → QUOTED → APPROVED → COMPLETED)
 * - Order status, workflow states, etc.
 */

type StateTransition<T extends string> = {
  from: T
  to: T
  valid: boolean
}

const createStateMachineValidator = <T extends string>(
  validTransitions: Map<T, T[]>
) => ({
  isValidTransition: (from: T, to: T): boolean => {
    const allowed = validTransitions.get(from)
    return allowed?.includes(to) ?? false
  },
  getAllowedTransitions: (from: T): T[] => {
    return validTransitions.get(from) ?? []
  },
  isTerminalState: (state: T): boolean => {
    const allowed = validTransitions.get(state)
    return allowed?.length === 0
  },
})

describe('State Machine Pattern', () => {
  describe('Booking Status State Machine', () => {
    type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

    const validBookingTransitions = new Map<BookingStatus, BookingStatus[]>([
      ['PENDING', ['CONFIRMED', 'CANCELLED']],
      ['CONFIRMED', ['COMPLETED', 'CANCELLED', 'NO_SHOW']],
      ['COMPLETED', []],
      ['CANCELLED', []],
      ['NO_SHOW', []],
    ])

    const validator = createStateMachineValidator(validBookingTransitions)

    describe('valid forward transitions', () => {
      it('should allow PENDING → CONFIRMED', () => {
        expect(validator.isValidTransition('PENDING', 'CONFIRMED')).toBe(true)
      })

      it('should allow PENDING → CANCELLED', () => {
        expect(validator.isValidTransition('PENDING', 'CANCELLED')).toBe(true)
      })

      it('should allow CONFIRMED → COMPLETED', () => {
        expect(validator.isValidTransition('CONFIRMED', 'COMPLETED')).toBe(true)
      })

      it('should allow CONFIRMED → NO_SHOW', () => {
        expect(validator.isValidTransition('CONFIRMED', 'NO_SHOW')).toBe(true)
      })
    })

    describe('invalid backward transitions', () => {
      it('should not allow CONFIRMED → PENDING', () => {
        expect(validator.isValidTransition('CONFIRMED', 'PENDING')).toBe(false)
      })

      it('should not allow COMPLETED → CONFIRMED', () => {
        expect(validator.isValidTransition('COMPLETED', 'CONFIRMED')).toBe(false)
      })

      it('should not allow CANCELLED → PENDING', () => {
        expect(validator.isValidTransition('CANCELLED', 'PENDING')).toBe(false)
      })
    })

    describe('terminal states', () => {
      it('should identify COMPLETED as terminal', () => {
        expect(validator.isTerminalState('COMPLETED')).toBe(true)
      })

      it('should identify CANCELLED as terminal', () => {
        expect(validator.isTerminalState('CANCELLED')).toBe(true)
      })

      it('should identify NO_SHOW as terminal', () => {
        expect(validator.isTerminalState('NO_SHOW')).toBe(true)
      })

      it('should not identify PENDING as terminal', () => {
        expect(validator.isTerminalState('PENDING')).toBe(false)
      })
    })
  })

  describe('Maintenance Job Status State Machine', () => {
    type JobStatus = 'OPEN' | 'QUOTED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

    const validJobTransitions = new Map<JobStatus, JobStatus[]>([
      ['OPEN', ['QUOTED', 'CANCELLED']],
      ['QUOTED', ['APPROVED', 'CANCELLED']],
      ['APPROVED', ['IN_PROGRESS', 'CANCELLED']],
      ['IN_PROGRESS', ['COMPLETED', 'CANCELLED']],
      ['COMPLETED', []],
      ['CANCELLED', []],
    ])

    const validator = createStateMachineValidator(validJobTransitions)

    describe('linear progression', () => {
      it('should enforce OPEN → QUOTED → APPROVED → IN_PROGRESS → COMPLETED', () => {
        expect(validator.isValidTransition('OPEN', 'QUOTED')).toBe(true)
        expect(validator.isValidTransition('QUOTED', 'APPROVED')).toBe(true)
        expect(validator.isValidTransition('APPROVED', 'IN_PROGRESS')).toBe(true)
        expect(validator.isValidTransition('IN_PROGRESS', 'COMPLETED')).toBe(true)
      })

      it('should not allow skipping states', () => {
        expect(validator.isValidTransition('OPEN', 'APPROVED')).toBe(false)
        expect(validator.isValidTransition('OPEN', 'COMPLETED')).toBe(false)
        expect(validator.isValidTransition('QUOTED', 'COMPLETED')).toBe(false)
      })
    })

    describe('cancellation from any non-terminal state', () => {
      const nonTerminalStates: JobStatus[] = ['OPEN', 'QUOTED', 'APPROVED', 'IN_PROGRESS']

      nonTerminalStates.forEach((state) => {
        it(`should allow ${state} → CANCELLED`, () => {
          expect(validator.isValidTransition(state, 'CANCELLED')).toBe(true)
        })
      })
    })

    describe('no recovery from terminal states', () => {
      it('should not allow COMPLETED → any state', () => {
        const allStates: JobStatus[] = ['OPEN', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
        allStates.forEach((state) => {
          expect(validator.isValidTransition('COMPLETED', state)).toBe(false)
        })
      })

      it('should not allow CANCELLED → any state', () => {
        const allStates: JobStatus[] = ['OPEN', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
        allStates.forEach((state) => {
          expect(validator.isValidTransition('CANCELLED', state)).toBe(false)
        })
      })
    })
  })

  describe('Generic State Machine Properties', () => {
    it('should list all allowed transitions from a state', () => {
      const transitions = new Map<string, string[]>([
        ['A', ['B', 'C']],
        ['B', ['C']],
        ['C', []],
      ])
      const validator = createStateMachineValidator(transitions)

      expect(validator.getAllowedTransitions('A')).toEqual(['B', 'C'])
      expect(validator.getAllowedTransitions('B')).toEqual(['C'])
      expect(validator.getAllowedTransitions('C')).toEqual([])
    })

    it('should return empty array for unknown states', () => {
      const transitions = new Map<string, string[]>([['A', ['B']]])
      const validator = createStateMachineValidator(transitions)

      expect(validator.getAllowedTransitions('UNKNOWN' as string)).toEqual([])
    })

    it('should handle self-transitions if explicitly allowed', () => {
      const transitions = new Map<string, string[]>([['A', ['A', 'B']]])
      const validator = createStateMachineValidator(transitions)

      expect(validator.isValidTransition('A', 'A')).toBe(true)
    })
  })
})
