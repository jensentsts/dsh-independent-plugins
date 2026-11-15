/** Whole-log historical request attribution; never reads the current model selector. */
export const PROJECTION_KEY = 'bubbleConversation';
export const PROJECTION_VERSION = 1;
const own = (value, key) => Object.hasOwn(value, key);
const validNumber = value => Number.isSafeInteger(value) && value >= 0;
const nonempty = value => typeof value === 'string' && value.length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stepKey = (turn, step) => `${turn}:${step}`;
const sameRoute = (left, right) => left?.provider === right?.provider && left?.model === right?.model;

/** New state is JSON-compatible and safe for projection checkpoints. */
export function initialProjection() {
  return { version: 1, header: null, activeStep: null, view: { version: 1, byMessageId: {}, byStep: {}, byCallId: {} } };
}

function headerFact(event) {
  const header = event.data?.header;
  const config = header?.config;
  if (!record(config) || !nonempty(config.provider) || !nonempty(config.model)) return null;
  const effort = nonempty(config.reasoningEffort) ? config.reasoningEffort : undefined;
  const effortOrigin = header.adapterDefaults?.reasoningEffort === true ? 'adapter-default' : effort === undefined ? 'unrecorded' : 'explicit';
  return { provider: config.provider, model: config.model, effortOrigin,
    ...(effort === undefined ? {} : { effort }), ...(validNumber(event.seq) ? { headerSeq: event.seq } : {}) };
}

function withRoute(header, actual, turn, step, identity = {}) {
  const route = actual ?? header;
  if (!route || !nonempty(route.provider) || !nonempty(route.model)) return null;
  const agrees = header !== null && sameRoute(header, route);
  return { provider: route.provider, model: route.model, turn, step,
    effortOrigin: agrees ? header.effortOrigin : header === null ? 'unrecorded' : 'route-mismatch',
    ...(agrees && header.effort !== undefined ? { effort: header.effort } : {}),
    ...(agrees && header.headerSeq !== undefined ? { headerSeq: header.headerSeq } : {}), ...identity };
}

function put(map, key, value) {
  return { ...map, [key]: value };
}
function sameFact(left, right) {
  return left !== undefined && left.provider === right.provider && left.model === right.model && left.effort === right.effort && left.effortOrigin === right.effortOrigin;
}
function updateStep(view, fact) {
  const key = stepKey(fact.turn, fact.step);
  return sameFact(view.byStep[key], fact) ? view : { ...view, byStep: put(view.byStep, key, fact) };
}

/** Fold one durable Session event. Unrelated events retain the exact state reference. */
export function applyProjection(state, event) {
  const data = event?.data;
  if (!record(data)) return state;
  if (event.type === 'request/header') {
    const header = headerFact(event);
    const activeStep = state.activeStep;
    if (activeStep === null) return { ...state, header };
    const fact = withRoute(header, null, activeStep.turn, activeStep.step);
    if (fact === null) return { ...state, header };
    return { ...state, header, view: updateStep(state.view, fact) };
  }
  if (event.type === 'step/start' && validNumber(data.turn) && validNumber(data.step)) {
    const activeStep = { turn: data.turn, step: data.step };
    const fact = withRoute(state.header, null, data.turn, data.step);
    return { ...state, activeStep, view: fact === null ? state.view : updateStep(state.view, fact) };
  }
  if (event.type === 'step/end' && state.activeStep?.turn === data.turn && state.activeStep?.step === data.step) return { ...state, activeStep: null };
  if (event.type === 'assistant/message' && validNumber(data.turn) && validNumber(data.step)) {
    if (event.surfaceOp !== 'append') return state;
    const message = data.message;
    const source = message?.source;
    if (source?.kind !== 'model' || !nonempty(source.provider) || !nonempty(source.model)) return state;
    const fact = withRoute(state.header, source, data.turn, data.step, {
      ...(nonempty(message.id) ? { messageId: message.id } : {}), ...(validNumber(event.seq) ? { seq: event.seq } : {}),
    });
    if (fact === null) return state;
    const previous = state.view.byStep[stepKey(data.turn, data.step)];
    if (sameFact(previous, fact)) return state;
    if (previous !== undefined && fact.messageId !== undefined) {
      return { ...state, view: { ...state.view, byMessageId: put(state.view.byMessageId, fact.messageId, fact) } };
    }
    return { ...state, view: updateStep(state.view, fact) };
  }
  if (event.type === 'tool/call' && nonempty(data.callId) && nonempty(data.name) && validNumber(data.turn) && validNumber(data.step)) {
    return { ...state, view: { ...state.view, byCallId: put(state.view.byCallId, data.callId, { toolName: data.name, turn: data.turn, step: data.step }) } };
  }
  if ((event.type === 'tool/ptc-dispatch-start' || event.type === 'tool/ptc-dispatch') && nonempty(data.subCallId) && nonempty(data.name)) {
    const parent = nonempty(data.rootCallId) && own(state.view.byCallId, data.rootCallId) ? state.view.byCallId[data.rootCallId] : undefined;
    const turn = validNumber(data.turn) ? data.turn : parent?.turn;
    const step = validNumber(data.step) ? data.step : parent?.step;
    if (turn === undefined || step === undefined) return state;
    return { ...state, view: { ...state.view, byCallId: put(state.view.byCallId, data.subCallId, { toolName: data.name, turn, step }) } };
  }
  return state;
}

/** Select one immutable model fact; all keys are looked up as own properties. */
export function modelFactFor(view, owner) {
  if (!view || view.version !== 1) return undefined;
  if (nonempty(owner.messageId) && own(view.byMessageId ?? {}, owner.messageId)) return view.byMessageId[owner.messageId];
  if (validNumber(owner.turn) && validNumber(owner.step)) return view.byStep?.[stepKey(owner.turn, owner.step)];
  if (nonempty(owner.callId) && own(view.byCallId ?? {}, owner.callId)) {
    const call = view.byCallId[owner.callId];
    return view.byStep?.[stepKey(call.turn, call.step)];
  }
  return undefined;
}

/** Public names include recorded explicit or adapter-default effort, never guessed effort. */
export function modelLabel(fact) {
  if (!fact?.model) return '';
  return ['explicit', 'adapter-default'].includes(fact.effortOrigin) && nonempty(fact.effort) ? `${fact.model}:${fact.effort}` : fact.model;
}

/** Runtime Zod schemas use the same supplied identity as DSH's projection registry. */
export function createProjectionDefinition(z) {
  const fact = z.object({ provider: z.string(), model: z.string(), effort: z.string().optional(),
    effortOrigin: z.enum(['explicit', 'adapter-default', 'unrecorded', 'route-mismatch']),
    headerSeq: z.number().int().nonnegative().optional(), messageId: z.string().optional(), seq: z.number().int().nonnegative().optional(),
    turn: z.number().int().nonnegative(), step: z.number().int().nonnegative() }).strict();
  const header = fact.omit({ turn: true, step: true, messageId: true, seq: true });
  const viewSchema = z.object({ version: z.literal(1), byMessageId: z.record(z.string(), fact), byStep: z.record(z.string(), fact),
    byCallId: z.record(z.string(), z.object({ toolName: z.string(), turn: z.number().int().nonnegative(), step: z.number().int().nonnegative() }).strict()) }).strict();
  const stateSchema = z.object({ version: z.literal(1), header: header.nullable(),
    activeStep: z.object({ turn: z.number().int().nonnegative(), step: z.number().int().nonnegative() }).nullable(), view: viewSchema }).strict();
  return { key: PROJECTION_KEY, stateVersion: PROJECTION_VERSION, stateSchema, init: initialProjection, apply: applyProjection,
    wire: { viewSchema, view: state => state.view, summary: false } };
}
