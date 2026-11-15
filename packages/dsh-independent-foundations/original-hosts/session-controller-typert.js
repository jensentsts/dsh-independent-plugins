/** Reattach the installed controller's unchanged wire declarations to the retained Host service. */
import { TYPERT } from '@deepseek-ai/dsh-api-session-controller/typert';
export const inject = ['typert', 'sessionController'];
/** Register only while this owner and the original Session controller are alive. */
export function apply(ctx) {
  ctx.effect(() => ctx.typert.register(TYPERT), 'independent-foundations: original Session wire declarations');
}
