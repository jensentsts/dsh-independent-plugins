import Schema from '@deepseek-ai/schemastery';
import { z } from 'zod';
import { createConfigSchema, normalizeConfig } from './src/config.js';
import { createProjectionDefinition } from './src/projection.js';

export const name = 'dsh-bubble-conversation';
export const inject = ['sessionProjections'];
export const Config = createConfigSchema(Schema);

/** Register the pure whole-log projection; rendering never changes Session history or billing. */
export async function apply(ctx, config) {
  const values = () => Object.fromEntries(Object.entries(config).map(([key, value]) => [key,
    value && typeof value.get === 'function' ? value.get() : value]));
  normalizeConfig(values());
  await ctx.sessionProjections.register(createProjectionDefinition(z));
  ctx.inject(['settings'], child => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
}
