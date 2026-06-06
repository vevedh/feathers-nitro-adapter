import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Application } from '@feathersjs/feathers'
import type { NitroApp } from 'nitropack'
import { FeathersInstanceManager } from '../src/runtime/manager'
import { setup, setupMultiple, getFeathersInstanceManager } from '../src/runtime/setup'

describe('Multi-Instance Setup Integration', () => {
  let manager: FeathersInstanceManager
  let mockNitroApp: any
  let mockFeathersApp1: any
  let mockFeathersApp2: any

  beforeEach(() => {
    FeathersInstanceManager.reset()
    manager = FeathersInstanceManager.getInstance()

    // Mock Nitro app
    mockNitroApp = {
      hooks: {
        callHook: vi.fn().mockResolvedValue(undefined),
        hook: vi.fn(),
      },
      router: {
        use: vi.fn(),
      },
    }

    // Mock Feathers apps
    mockFeathersApp1 = {
      _isSetup: false,
      _isSetupStarted: false,
      nitroApp: undefined,
      setup: vi.fn().mockResolvedValue(undefined),
      teardown: vi.fn().mockResolvedValue(undefined),
      configure: vi.fn(),
    }

    mockFeathersApp2 = {
      _isSetup: false,
      _isSetupStarted: false,
      nitroApp: undefined,
      setup: vi.fn().mockResolvedValue(undefined),
      teardown: vi.fn().mockResolvedValue(undefined),
      configure: vi.fn(),
    }
  })

  afterEach(() => {
    manager.clear()
    FeathersInstanceManager.reset()
    vi.clearAllMocks()
  })

  describe('setup - Single Instance', () => {
    it('should setup a single instance without options', async () => {
      await setup(mockNitroApp, mockFeathersApp1)

      expect(mockFeathersApp1.setup).toHaveBeenCalled()
      expect(mockFeathersApp1.nitroApp).toBe(mockNitroApp)
      expect(manager.has('default')).toBe(true)
    })

    it('should setup a single instance with custom id', async () => {
      await setup(mockNitroApp, mockFeathersApp1, { id: 'api-v1' })

      expect(mockFeathersApp1.setup).toHaveBeenCalled()
      expect(manager.has('api-v1')).toBe(true)
      const entry = manager.get('api-v1')
      expect(entry?.id).toBe('api-v1')
    })

    it('should setup a single instance with basePath', async () => {
      await setup(mockNitroApp, mockFeathersApp1, { 
        id: 'api',
        basePath: '/api/v1'
      })

      const entry = manager.get('api')
      expect(entry?.options.basePath).toBe('/api/v1')
    })

    it('should call beforeSetup and afterSetup hooks', async () => {
      await setup(mockNitroApp, mockFeathersApp1, { id: 'test' })

      expect(mockNitroApp.hooks.callHook).toHaveBeenCalledWith(
        'feathers:beforeSetup',
        mockFeathersApp1
      )
      expect(mockNitroApp.hooks.callHook).toHaveBeenCalledWith(
        'feathers:afterSetup',
        mockFeathersApp1
      )
    })

    it('should register close hook for teardown', async () => {
      await setup(mockNitroApp, mockFeathersApp1)

      expect(mockNitroApp.hooks.hook).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      )
    })

    it('should not setup twice', async () => {
      mockFeathersApp1._isSetup = true
      
      await setup(mockNitroApp, mockFeathersApp1)

      expect(mockFeathersApp1.setup).not.toHaveBeenCalled()
    })

    it('should set nitroApp reference', async () => {
      await setup(mockNitroApp, mockFeathersApp1, { id: 'test' })

      const entry = manager.get('test')
      expect(entry?.nitroApp).toBe(mockNitroApp)
    })
  })

  describe('setupMultiple - Multiple Instances', () => {
    it('should setup multiple instances', async () => {
      await setupMultiple(mockNitroApp, [
        { app: mockFeathersApp1, options: { id: 'api-1' } },
        { app: mockFeathersApp2, options: { id: 'api-2' } },
      ])

      expect(mockFeathersApp1.setup).toHaveBeenCalled()
      expect(mockFeathersApp2.setup).toHaveBeenCalled()
      expect(manager.size()).toBe(2)
    })

    it('should setup multiple instances with different paths', async () => {
      await setupMultiple(mockNitroApp, [
        { app: mockFeathersApp1, options: { id: 'users', basePath: '/api/users' } },
        { app: mockFeathersApp2, options: { id: 'products', basePath: '/api/products' } },
      ])

      expect(manager.get('users')?.options.basePath).toBe('/api/users')
      expect(manager.get('products')?.options.basePath).toBe('/api/products')
    })

    it('should setup multiple instances with metadata', async () => {
      await setupMultiple(mockNitroApp, [
        { app: mockFeathersApp1, options: { id: 'auth', metadata: { version: '1.0', type: 'auth' } } },
        { app: mockFeathersApp2, options: { id: 'data', metadata: { version: '2.0', type: 'data' } } },
      ])

      expect(manager.get('auth')?.options.metadata).toEqual({ version: '1.0', type: 'auth' })
      expect(manager.get('data')?.options.metadata).toEqual({ version: '2.0', type: 'data' })
    })

    it('should call hooks for each instance', async () => {
      await setupMultiple(mockNitroApp, [
        { app: mockFeathersApp1, options: { id: 'api-1' } },
        { app: mockFeathersApp2, options: { id: 'api-2' } },
      ])

      const beforeSetupCalls = mockNitroApp.hooks.callHook.mock.calls.filter(
        call => call[0] === 'feathers:beforeSetup'
      )
      const afterSetupCalls = mockNitroApp.hooks.callHook.mock.calls.filter(
        call => call[0] === 'feathers:afterSetup'
      )

      expect(beforeSetupCalls).toHaveLength(2)
      expect(afterSetupCalls).toHaveLength(2)
    })

    it('should setup instances in parallel', async () => {
      const startTime = Date.now()
      
      mockFeathersApp1.setup = vi.fn(() => 
        new Promise(resolve => setTimeout(resolve, 50))
      )
      mockFeathersApp2.setup = vi.fn(() => 
        new Promise(resolve => setTimeout(resolve, 50))
      )

      await setupMultiple(mockNitroApp, [
        { app: mockFeathersApp1, options: { id: 'api-1' } },
        { app: mockFeathersApp2, options: { id: 'api-2' } },
      ])

      const duration = Date.now() - startTime
      // Should be ~50ms (parallel), not ~100ms (sequential)
      expect(duration).toBeLessThan(150)
    })
  })

  describe('getFeathersInstanceManager', () => {
    it('should return the FeathersInstanceManager singleton', () => {
      const manager1 = getFeathersInstanceManager()
      const manager2 = getFeathersInstanceManager()
      
      expect(manager1).toBe(manager2)
      expect(manager1).toBeInstanceOf(FeathersInstanceManager)
    })
  })

  describe('Instance Lifecycle', () => {
    it('should track setup state through lifecycle', async () => {
      const entry1 = manager.get('api')
      expect(entry1).toBeUndefined()

      await setup(mockNitroApp, mockFeathersApp1, { id: 'api' })

      const entry2 = manager.get('api')
      expect(entry2).toBeDefined()
      expect(entry2?.isSetup).toBe(true)
      expect(entry2?.isSetupStarted).toBe(false)
    })

    it('should handle registration for already registered instance', async () => {
      await setup(mockNitroApp, mockFeathersApp1, { id: 'api' })
      
      const entry1 = manager.get('api')
      expect(entry1?.app).toBe(mockFeathersApp1)

      // Setup the same instance again should not re-register
      mockFeathersApp1._isSetup = true
      await setup(mockNitroApp, mockFeathersApp1, { id: 'api' })

      const entry2 = manager.get('api')
      expect(entry2?.app).toBe(mockFeathersApp1)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing nitroApp gracefully', async () => {
      const appWithoutSetup = { ...mockFeathersApp1, nitroApp: undefined }
      
      // Create a scenario where entry exists but nitroApp is not set yet
      manager.register(appWithoutSetup, { id: 'test' })
      
      // This should not throw
      await setup(mockNitroApp, appWithoutSetup, { id: 'test' })
      
      expect(appWithoutSetup.setup).toHaveBeenCalled()
    })

    it('should handle setupMultiple with mixed configurations', async () => {
      await setupMultiple(mockNitroApp, [
        { app: mockFeathersApp1 }, // No options
        { app: mockFeathersApp2, options: { id: 'api-2', basePath: '/api' } },
      ])

      expect(manager.size()).toBe(2)
      expect(manager.get('default')?.app).toBe(mockFeathersApp1)
      expect(manager.get('api-2')?.app).toBe(mockFeathersApp2)
    })
  })

  describe('Multiple Instances with Different Configurations', () => {
    it('should support microservices architecture pattern', async () => {
      const mockAuthApp = { ...mockFeathersApp1, name: 'auth' }
      const mockUsersApp = { ...mockFeathersApp2, name: 'users' }

      await setupMultiple(mockNitroApp, [
        { 
          app: mockAuthApp, 
          options: { 
            id: 'auth-service',
            basePath: '/api/auth',
            metadata: { service: 'authentication', version: '1.0' }
          } 
        },
        { 
          app: mockUsersApp, 
          options: { 
            id: 'users-service',
            basePath: '/api/users',
            metadata: { service: 'user-management', version: '2.0' }
          } 
        },
      ])

      const all = manager.getAll()
      expect(all).toHaveLength(2)
      expect(all[0].options.metadata.service).toBe('authentication')
      expect(all[1].options.metadata.service).toBe('user-management')
    })

    it('should support multi-tenant architecture pattern', async () => {
      const tenants = ['acme-corp', 'tech-startup', 'global-enterprise']
      const instances = tenants.map((tenant, index) => ({
        app: {
          _isSetup: false,
          _isSetupStarted: false,
          setup: vi.fn().mockResolvedValue(undefined),
          teardown: vi.fn().mockResolvedValue(undefined),
        } as any,
        options: {
          id: `tenant-${tenant}`,
          basePath: `/api/tenants/${tenant}`,
          metadata: { tenantId: tenant, environment: 'production' }
        }
      }))

      await setupMultiple(mockNitroApp, instances)

      expect(manager.size()).toBe(3)
      const allInstances = manager.getAll()
      allInstances.forEach((instance, index) => {
        expect(instance.options.metadata.tenantId).toBe(tenants[index])
      })
    })
  })
})
