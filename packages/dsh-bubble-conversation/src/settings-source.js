import { normalizeConfig } from './config.js';

/** Decode this plugin's section while keeping the shared native form write queue. */
export function createSettingsSource(form, description, namespace) {
  let previousForm, previousDescription, snapshot;
  return {
    getSnapshot() {
      const currentForm = form.getSnapshot();
      if (currentForm.status === 'ready' || !description) return currentForm;
      const currentDescription = description.getSnapshot();
      if (currentForm === previousForm && currentDescription === previousDescription) return snapshot;
      previousForm = currentForm; previousDescription = currentDescription;
      const section = currentDescription.view?.namespaces.find(value => value.ns === namespace);
      snapshot = currentForm;
      if (section) {
        try {
          snapshot = Object.freeze({ ...currentForm, status: 'ready', value: normalizeConfig(section.value),
            base: section.base, user: section.user, revision: section.revision,
            writable: currentDescription.view.writable === true });
        } catch (error) {
          snapshot = Object.freeze({ ...currentForm, status: 'unavailable', value: undefined, writable: false });
        }
      }
      return snapshot;
    },
    subscribe(listener) {
      const offForm = form.subscribe(listener);
      const offDescription = description?.subscribe(listener);
      return () => { offForm(); offDescription?.(); };
    },
  };
}
