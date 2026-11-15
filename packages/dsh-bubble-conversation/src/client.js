import { appearanceFor } from './roles.js';
import { normalizeConfig, SETTINGS_NAMESPACE } from './config.js';
import { dictionaries, LOCALE_NAMESPACE } from './locales.js';
import { MemberSettings, MessageHeader, MessageAvatar } from './client-components.js';
import { createSettingsSource } from './settings-source.js';
import cssText from './styles.css';

/** No private UI package, SlotCore entry, renderer, or DOM transcript access is used. */
export const inject = ['slots', 'locale', 'configForms'];

function statusSource() {
  let value = Object.freeze({ supported: false, error: null });
  const listeners = new Set();
  return { getSnapshot: () => value, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    publish(next) { if (value.supported === next.supported && value.error === next.error) return; value = Object.freeze(next); for (const listener of listeners) listener(); } };
}

/** Install independent settings plus chrome contributions only when the explicit v1 seam exists. */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, dictionaries));
  const t = ctx.locale.bind(LOCALE_NAMESPACE);
  const form = ctx.configForms.get(SETTINGS_NAMESPACE);
  const support = statusSource();
  const questionSupport = statusSource();
  const gutterSupport = statusSource();
  const configSource = createSettingsSource(form, ctx.configForms.describe?.(), SETTINGS_NAMESPACE);
  const sharedInject = () => ({ hooks: { bubbleConfig: configSource, chromeSupport: support, questionSupport, gutterSupport }, saveField: (field, value) => form.set(field, value) });
  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.plugin = 'dsh-bubble-conversation'; style.textContent = cssText; document.head.appendChild(style);
    return () => style.remove();
  });
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: SETTINGS_NAMESPACE, order: 45, label: () => t('nav'), locale: LOCALE_NAMESPACE,
    inject: sharedInject,
  }, MemberSettings));
  ctx.inject(['uiQuestionPresentation'], child => {
    const presentation = child.get('uiQuestionPresentation');
    if (presentation?.contractVersion !== 1 || typeof presentation.registerPresentation !== 'function') {
      questionSupport.publish({ supported: false, error: 'unsupported-version' });
      child.effect(() => () => questionSupport.publish({ supported: false, error: null }));
      return;
    }
    child.effect(() => {
      let offPresentation;
      let mode;
      const sync = () => {
        const snapshot = configSource.getSnapshot();
        try {
          const config = snapshot.status === 'ready' ? normalizeConfig(snapshot.value ?? {}) : null;
          const nextMode = config?.enabled ? config.questionLayout : undefined;
          if (nextMode === mode && (nextMode === undefined || offPresentation !== undefined)) {
            questionSupport.publish({ supported: true, error: null });
            return;
          }
          offPresentation?.(); offPresentation = undefined; mode = undefined;
          if (nextMode !== undefined) {
            offPresentation = presentation.registerPresentation({ id: SETTINGS_NAMESPACE, priority: 100, mode: nextMode });
            mode = nextMode;
          }
          questionSupport.publish({ supported: true, error: null });
        } catch (error) {
          offPresentation?.(); offPresentation = undefined; mode = undefined;
          questionSupport.publish({ supported: true, error: 'invalid-config-or-registration' });
        }
      };
      const offConfig = configSource.subscribe(sync); sync();
      return () => { offConfig(); offPresentation?.(); questionSupport.publish({ supported: false, error: null }); };
    });
  });
  ctx.inject(['uiChatChrome'], child => {
    const chrome = child.get('uiChatChrome');
    if (chrome?.contractVersion !== 1 || typeof chrome.registerAppearance !== 'function') {
      support.publish({ supported: false, error: 'unsupported-version' });
      return;
    }
    const avatarPlacementSupported = chrome.avatarPlacementVersion === 1;
    child.effect(() => {
      gutterSupport.publish({ supported: avatarPlacementSupported, error: null });
      return () => gutterSupport.publish({ supported: false, error: null });
    });
    child.effect(() => {
      support.publish({ supported: true, error: null });
      let offAppearance;
      const sync = () => {
        offAppearance?.(); offAppearance = undefined;
        const snapshot = configSource.getSnapshot();
        if (snapshot.status !== 'ready') return;
        try {
          const config = normalizeConfig(snapshot.value ?? {});
          offAppearance = chrome.registerAppearance({ id: 'dsh-bubble-conversation', priority: 100, select: owner => appearanceFor(owner, config, avatarPlacementSupported) });
          support.publish({ supported: true, error: null });
        } catch (error) {
          support.publish({ supported: true, error: error instanceof Error ? error.message : String(error) });
        }
      };
      const offConfig = configSource.subscribe(sync); sync();
      return () => { offConfig(); offAppearance?.(); support.publish({ supported: false, error: null }); };
    });
    child.slots.inject('conversation.chat.message.header', () => child.slots.register({
      name: 'conversation.chat.message.header', locale: LOCALE_NAMESPACE, inject: sharedInject,
    }, MessageHeader));
    child.slots.inject('conversation.chat.message.avatar', () => child.slots.register({
      name: 'conversation.chat.message.avatar', locale: LOCALE_NAMESPACE, inject: sharedInject,
    }, MessageAvatar));
  });
}
