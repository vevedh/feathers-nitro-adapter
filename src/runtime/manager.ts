import type { Application } from '@feathersjs/feathers'
import type { NitroApp } from 'nitropack'

export interface FeathersInstanceOptions {
  /**
   * Unique identifier for this Feathers instance
   * @default 'default'
   */
  id?: string

  /**
   * Base path for routing this instance
   * @default '/feathers'
   */
  basePath?: string

  /**
   * Whether to auto-setup the instance on registration
   * @default true
   */
  autoSetup?: boolean

  /**
   * Custom metadata for this instance
   */
  metadata?: Record<string, any>
}

export interface FeathersInstanceEntry {
  id: string
  app: Application
  nitroApp?: NitroApp
  options: Required<FeathersInstanceOptions>
  isSetupStarted: boolean
  isSetup: boolean
}

/**
 * Global manager for multiple FeathersJS instances
 * Allows running multiple independent Feathers applications in parallel
 */
export class FeathersInstanceManager {
  private static instance: FeathersInstanceManager
  private instances: Map<string, FeathersInstanceEntry> = new Map()
  private defaultInstanceId = 'default'

  private constructor() {}

  /**
   * Get or create the singleton instance of FeathersInstanceManager
   */
  static getInstance(): FeathersInstanceManager {
    if (!FeathersInstanceManager.instance) {
      FeathersInstanceManager.instance = new FeathersInstanceManager()
    }
    return FeathersInstanceManager.instance
  }

  /**
   * Register a new Feathers application instance
   */
  register(app: Application, options?: FeathersInstanceOptions): void {
    const id = options?.id || this.defaultInstanceId
    const basePath = options?.basePath || '/feathers'
    const autoSetup = options?.autoSetup !== false

    if (this.instances.has(id)) {
      console.warn(`FeathersInstanceManager: Instance "${id}" is already registered. Overwriting.`)
    }

    const entry: FeathersInstanceEntry = {
      id,
      app,
      options: {
        id,
        basePath,
        autoSetup,
        metadata: options?.metadata || {},
      },
      isSetupStarted: false,
      isSetup: false,
    }

    this.instances.set(id, entry)
  }

  /**
   * Get a registered Feathers application by ID
   */
  get(id: string = this.defaultInstanceId): FeathersInstanceEntry | undefined {
    return this.instances.get(id)
  }

  /**
   * Get all registered instances
   */
  getAll(): FeathersInstanceEntry[] {
    return Array.from(this.instances.values())
  }

  /**
   * Check if an instance is registered
   */
  has(id: string): boolean {
    return this.instances.has(id)
  }

  /**
   * Unregister an instance
   */
  unregister(id: string): boolean {
    return this.instances.delete(id)
  }

  /**
   * Clear all registered instances
   */
  clear(): void {
    this.instances.clear()
  }

  /**
   * Set the default instance ID
   */
  setDefaultInstanceId(id: string): void {
    if (!this.instances.has(id)) {
      throw new Error(`Cannot set default instance to "${id}": instance not found`)
    }
    this.defaultInstanceId = id
  }

  /**
   * Get the default instance
   */
  getDefault(): FeathersInstanceEntry | undefined {
    return this.get(this.defaultInstanceId)
  }

  /**
   * Get the number of registered instances
   */
  size(): number {
    return this.instances.size
  }

  /**
   * Update the NitroApp reference for an instance
   */
  setNitroApp(id: string, nitroApp: NitroApp): void {
    const entry = this.instances.get(id)
    if (entry) {
      entry.nitroApp = nitroApp
    }
  }

  /**
   * Mark an instance as setup started
   */
  markSetupStarted(id: string): void {
    const entry = this.instances.get(id)
    if (entry) {
      entry.isSetupStarted = true
    }
  }

  /**
   * Mark an instance as setup complete
   */
  markSetupComplete(id: string): void {
    const entry = this.instances.get(id)
    if (entry) {
      entry.isSetupStarted = false
      entry.isSetup = true
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    FeathersInstanceManager.instance = undefined as any
  }
}
