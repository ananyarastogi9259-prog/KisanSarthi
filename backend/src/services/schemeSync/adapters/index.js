// ============================================================
// src/services/schemeSync/adapters/index.js
// Adapter Registry & Factory
// ============================================================

import { PmKisanAdapter } from './PmKisanAdapter.js'
import { PmfbyAdapter } from './PmfbyAdapter.js'
import { KccAdapter } from './KccAdapter.js'
import { UpKarjRahatAdapter } from './UpKarjRahatAdapter.js'
import { UpSolarPumpAdapter } from './UpSolarPumpAdapter.js'

export const ADAPTER_REGISTRY = {
  '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6': PmKisanAdapter,
  '566cc552-121e-4fe9-876f-414abcfb452d': PmfbyAdapter,
  '6c64581f-b287-4da6-86c7-3da46985297f': KccAdapter,
  'fbcc8b8d-2662-41fc-b6cd-83117c28f26b': UpKarjRahatAdapter,
  'c3c61d25-ae2e-4627-9b74-f6bb80a7cf5e': UpSolarPumpAdapter,
}

/**
 * Instantiates the appropriate adapter for a given scheme UUID.
 * @param {string} schemeId
 * @param {Object} [options={}]
 * @returns {import('./BaseSchemeAdapter.js').BaseSchemeAdapter|null}
 */
export function getAdapterForScheme(schemeId, options = {}) {
  const AdapterClass = ADAPTER_REGISTRY[schemeId]
  if (!AdapterClass) {
    return null
  }
  return new AdapterClass(options)
}

/**
 * Returns instantiated adapters for all 5 verified schemes.
 * @param {Object} [options={}]
 * @returns {Array<import('./BaseSchemeAdapter.js').BaseSchemeAdapter>}
 */
export function getAllAdapters(options = {}) {
  return Object.values(ADAPTER_REGISTRY).map((AdapterClass) => new AdapterClass(options))
}

export {
  PmKisanAdapter,
  PmfbyAdapter,
  KccAdapter,
  UpKarjRahatAdapter,
  UpSolarPumpAdapter,
}

