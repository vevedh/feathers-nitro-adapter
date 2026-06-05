import type { Application } from '@feathersjs/feathers'
import type { NitroApp } from 'nitropack'
import { FeathersInstanceManager, type FeathersInstanceOptions } from './manager'

/**
 * Setup a single Feathers application instance
 * This is used internally by the plugin system
 */
export async function setup(nitroApp: NitroApp, feathersApp: Application, instanceOptions?: FeathersInstanceOptions) {
  const manager = FeathersInstanceManager.getInstance()
  const instanceId = instanceOptions?.id || 'default'

  // Register instance if not already registered
  if (!manager.has(instanceId)) {
    manager.register(feathersApp, instanceOptions)
  }

  const entry = manager.get(instanceId)
  if (!entry) return

  if (!feathersApp._isSetup && !entry.isSetupStarted) {
    entry.isSetupStarted = true
    manager.markSetupStarted(instanceId)
    feathersApp.nitroApp = nitroApp
    entry.nitroApp = nitroApp

    await nitroApp.hooks.callHook('feathers:beforeSetup', feathersApp)

    await feathersApp.setup()

    manager.markSetupComplete(instanceId)

    nitroApp.hooks.hook('close', async () => feathersApp.teardown())

    await nitroApp.hooks.callHook('feathers:afterSetup', feathersApp)
  }
}

/**
 * Setup multiple Feathers application instances
 * Allows managing multiple independent Feathers apps in a single Nitro application
 */
export async function setupMultiple(nitroApp: NitroApp, instances: Array<{ app: Application, options?: FeathersInstanceOptions }>) {
  const manager = FeathersInstanceManager.getInstance()

  // Register all instances
  for (const { app, options } of instances) {
    const instanceId = options?.id || 'default'
    if (!manager.has(instanceId)) {
      manager.register(app, options)
    }
  }

  // Setup all instances
  const setupPromises = instances.map(({ app, options }) =>
    setup(nitroApp, app, options)
  )

  await Promise.all(setupPromises)
}

/**
 * Get the Feathers instance manager
 * Useful for accessing registered instances
 */
export function getFeathersInstanceManager() {
  return FeathersInstanceManager.getInstance()
}
