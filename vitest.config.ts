import { defineConfig } from 'vitest/config';
import unitConfig from './vitest.unit.config';

/**
 * Vitest workspace entrypoint
 *
 * For now we use a single project configuration (unit tests).
 * If we add more projects later, we can switch to defineWorkspace.
 */
export default defineConfig(unitConfig);
