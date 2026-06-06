import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FeathersInstanceManager } from '../src/runtime/manager'
import type { Application } from '@feathersjs/feathers'

describe('FeathersInstanceManager', () => {
  let manager: FeathersInstanceManager

  beforeEach(() => {
    FeathersInstanceManager.reset()
    manager = FeathersInstanceManager.getInstance()
  })

  afterEach(() => {
    manager.clear()
    FeathersInstanceManager.reset()
  })

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const manager1 = FeathersInstanceManager.getInstance()
      const manager2 = FeathersInstanceManager.getInstance()
      expect(manager1).toBe(manager2)
    })
  })

  describe('register', () => {
    it('should register an instance with default id', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp)
      expect(manager.has('default')).toBe(true)
    })

    it('should register an instance with custom id', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'api-v1' })
      expect(manager.has('api-v1')).toBe(true)
    })

    it('should register with custom basePath', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'api', basePath: '/api/v1' })
      const entry = manager.get('api')
      expect(entry?.options.basePath).toBe('/api/v1')
    })

    it('should register with metadata', () => {
      const mockApp = { _isSetup: false } as any as Application
      const metadata = { version: '1.0', type: 'users' }
      manager.register(mockApp, { id: 'users', metadata })
      const entry = manager.get('users')
      expect(entry?.options.metadata).toEqual(metadata)
    })

    it('should warn when overwriting an existing instance', () => {
      const mockApp1 = { _isSetup: false } as any as Application
      const mockApp2 = { _isSetup: false } as any as Application
      manager.register(mockApp1, { id: 'api' })
      const consoleSpy = console.warn as any
      manager.register(mockApp2, { id: 'api' })
      expect(manager.get('api')?.app).toBe(mockApp2)
    })
  })

  describe('get', () => {
    it('should return registered instance', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'test' })
      const entry = manager.get('test')
      expect(entry).toBeDefined()
      expect(entry?.app).toBe(mockApp)
    })

    it('should return default instance when no id provided', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp)
      const entry = manager.get()
      expect(entry).toBeDefined()
      expect(entry?.id).toBe('default')
    })

    it('should return undefined for non-existent instance', () => {
      const entry = manager.get('non-existent')
      expect(entry).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return all registered instances', () => {
      const mockApp1 = { _isSetup: false } as any as Application
      const mockApp2 = { _isSetup: false } as any as Application
      const mockApp3 = { _isSetup: false } as any as Application
      
      manager.register(mockApp1, { id: 'api-1' })
      manager.register(mockApp2, { id: 'api-2' })
      manager.register(mockApp3, { id: 'api-3' })

      const all = manager.getAll()
      expect(all).toHaveLength(3)
      expect(all.map(e => e.id)).toEqual(['api-1', 'api-2', 'api-3'])
    })

    it('should return empty array when no instances registered', () => {
      const all = manager.getAll()
      expect(all).toHaveLength(0)
    })
  })

  describe('has', () => {
    it('should return true for registered instance', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'test' })
      expect(manager.has('test')).toBe(true)
    })

    it('should return false for non-existent instance', () => {
      expect(manager.has('non-existent')).toBe(false)
    })
  })

  describe('unregister', () => {
    it('should unregister an instance', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'test' })
      expect(manager.has('test')).toBe(true)
      const result = manager.unregister('test')
      expect(result).toBe(true)
      expect(manager.has('test')).toBe(false)
    })

    it('should return false when unregistering non-existent instance', () => {
      const result = manager.unregister('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear all registered instances', () => {
      const mockApp1 = { _isSetup: false } as any as Application
      const mockApp2 = { _isSetup: false } as any as Application
      
      manager.register(mockApp1, { id: 'api-1' })
      manager.register(mockApp2, { id: 'api-2' })
      
      expect(manager.size()).toBe(2)
      manager.clear()
      expect(manager.size()).toBe(0)
    })
  })

  describe('setDefaultInstanceId', () => {
    it('should set the default instance id', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'custom' })
      manager.setDefaultInstanceId('custom')
      const entry = manager.get()
      expect(entry?.id).toBe('custom')
    })

    it('should throw error when setting non-existent instance as default', () => {
      expect(() => {
        manager.setDefaultInstanceId('non-existent')
      }).toThrow('Cannot set default instance to "non-existent": instance not found')
    })
  })

  describe('getDefault', () => {
    it('should get the default instance', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'default' })
      const entry = manager.getDefault()
      expect(entry?.id).toBe('default')
    })

    it('should return undefined when no default instance', () => {
      const entry = manager.getDefault()
      expect(entry).toBeUndefined()
    })
  })

  describe('size', () => {
    it('should return the number of registered instances', () => {
      const mockApp1 = { _isSetup: false } as any as Application
      const mockApp2 = { _isSetup: false } as any as Application
      
      manager.register(mockApp1, { id: 'api-1' })
      expect(manager.size()).toBe(1)
      
      manager.register(mockApp2, { id: 'api-2' })
      expect(manager.size()).toBe(2)
    })

    it('should return 0 when no instances registered', () => {
      expect(manager.size()).toBe(0)
    })
  })

  describe('setNitroApp', () => {
    it('should set NitroApp reference for an instance', () => {
      const mockApp = { _isSetup: false } as any as Application
      const mockNitroApp = {} as any
      
      manager.register(mockApp, { id: 'test' })
      manager.setNitroApp('test', mockNitroApp)
      
      const entry = manager.get('test')
      expect(entry?.nitroApp).toBe(mockNitroApp)
    })
  })

  describe('markSetupStarted', () => {
    it('should mark instance setup as started', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'test' })
      
      const entryBefore = manager.get('test')
      expect(entryBefore?.isSetupStarted).toBe(false)
      
      manager.markSetupStarted('test')
      
      const entryAfter = manager.get('test')
      expect(entryAfter?.isSetupStarted).toBe(true)
    })
  })

  describe('markSetupComplete', () => {
    it('should mark instance setup as complete', () => {
      const mockApp = { _isSetup: false } as any as Application
      manager.register(mockApp, { id: 'test' })
      manager.markSetupStarted('test')
      
      manager.markSetupComplete('test')
      
      const entry = manager.get('test')
      expect(entry?.isSetupStarted).toBe(false)
      expect(entry?.isSetup).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset the singleton instance', () => {
      const manager1 = FeathersInstanceManager.getInstance()
      const mockApp = { _isSetup: false } as any as Application
      manager1.register(mockApp)
      
      FeathersInstanceManager.reset()
      
      const manager2 = FeathersInstanceManager.getInstance()
      expect(manager1).not.toBe(manager2)
      expect(manager2.size()).toBe(0)
    })
  })

  describe('Multiple instances workflow', () => {
    it('should handle multiple instances independently', () => {
      const mockApp1 = { _isSetup: false } as any as Application
      const mockApp2 = { _isSetup: false } as any as Application
      const mockApp3 = { _isSetup: false } as any as Application
      
      manager.register(mockApp1, { 
        id: 'users-api',
        basePath: '/api/users',
        metadata: { type: 'users' }
      })
      manager.register(mockApp2, { 
        id: 'products-api',
        basePath: '/api/products',
        metadata: { type: 'products' }
      })
      manager.register(mockApp3, { 
        id: 'auth-api',
        basePath: '/api/auth',
        metadata: { type: 'auth' }
      })

      const all = manager.getAll()
      expect(all).toHaveLength(3)
      expect(all[0].options.basePath).toBe('/api/users')
      expect(all[1].options.basePath).toBe('/api/products')
      expect(all[2].options.basePath).toBe('/api/auth')
    })
  })
})
