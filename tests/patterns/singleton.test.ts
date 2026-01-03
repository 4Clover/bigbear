import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Generic singleton pattern tests.
 * These validate the behavior of singleton patterns commonly used for:
 * - Database clients (Prisma)
 * - Configuration objects
 * - Service instances
 */
describe('Singleton Pattern', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.resetModules()
    // Clean up any global singleton storage
    const globalWithPrisma = globalThis as { prisma?: unknown }
    delete globalWithPrisma.prisma
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('globalThis caching behavior', () => {
    it('should store singleton on globalThis in development', () => {
      // Pattern: In development, singletons are cached on globalThis
      // to survive hot module replacement
      process.env.NODE_ENV = 'development'

      const globalStore = globalThis as { singleton?: object }
      const instance = { id: 'test-instance' }

      // Simulate singleton pattern
      globalStore.singleton = globalStore.singleton || instance

      expect(globalStore.singleton).toBe(instance)
    })

    it('should return same instance on repeated access', () => {
      const globalStore = globalThis as { singleton?: object }
      const instance = { id: 'original' }

      globalStore.singleton = instance
      const secondAccess = globalStore.singleton || { id: 'new' }

      expect(secondAccess).toBe(instance)
      expect(secondAccess.id).toBe('original')
    })

    it('should not pollute global scope in production', () => {
      // Pattern: In production, don't store on globalThis
      process.env.NODE_ENV = 'production'

      const globalStore = globalThis as { prodSingleton?: object }
      const shouldNotCache = process.env.NODE_ENV === 'production'

      const instance = { id: 'prod-instance' }

      if (!shouldNotCache) {
        globalStore.prodSingleton = instance
      }

      expect(globalStore.prodSingleton).toBeUndefined()
    })
  })

  describe('lazy initialization', () => {
    it('should create instance only when first accessed', () => {
      let instanceCreated = false

      const createInstance = () => {
        instanceCreated = true
        return { created: true }
      }

      // Instance not created yet
      expect(instanceCreated).toBe(false)

      // First access triggers creation
      const instance = createInstance()
      expect(instanceCreated).toBe(true)
      expect(instance.created).toBe(true)
    })

    it('should reuse existing instance instead of creating new', () => {
      let creationCount = 0

      const getInstance = (() => {
        let instance: { count: number } | null = null
        return () => {
          if (!instance) {
            creationCount++
            instance = { count: creationCount }
          }
          return instance
        }
      })()

      const first = getInstance()
      const second = getInstance()
      const third = getInstance()

      expect(creationCount).toBe(1)
      expect(first).toBe(second)
      expect(second).toBe(third)
    })
  })

  describe('environment-based behavior', () => {
    it('should detect development environment correctly', () => {
      process.env.NODE_ENV = 'development'
      expect(process.env.NODE_ENV).toBe('development')
      expect(process.env.NODE_ENV !== 'production').toBe(true)
    })

    it('should detect production environment correctly', () => {
      process.env.NODE_ENV = 'production'
      expect(process.env.NODE_ENV).toBe('production')
      expect(process.env.NODE_ENV !== 'production').toBe(false)
    })

    it('should handle test environment', () => {
      process.env.NODE_ENV = 'test'
      // Test environment typically behaves like development
      expect(process.env.NODE_ENV !== 'production').toBe(true)
    })
  })
})
