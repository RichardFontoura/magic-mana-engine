export class HandlebarsApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {}

export const MODULE_ID = "magic-mana-engine";

export const { DialogV2 } = foundry.applications.api;

export const { duplicate } = foundry.utils;

export const FilePicker = foundry.applications.apps.FilePicker.implementation;

export const notify = {
  info(msg) {
    void ui?.notifications?.info(msg);
  },
  error(msg) {
    void ui?.notifications?.error(msg);
  },
  success(msg) {
    void ui?.notifications?.success(msg);
  },
  warn(msg) {
    void ui?.notifications?.warn(msg);
  },
};

export function mergeObject(obj, source) {
  return foundry.utils.mergeObject(obj, source);
}

export function randomID(length = 16) {
  return foundry.utils.randomID(length);
}

export function getAppId(className) {
  return className
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/^_+/, "");
}

export function i18nLocalize(key, fallback = "") {
  return game.i18n?.localize(`${MODULE_ID}.${key}`) ?? fallback;
}

export function i18nLocalizeFormat(key, format, fallback = "") {
  return game.i18n?.format(`${MODULE_ID}.${key}`, format) ?? fallback;
}

export function getModule(_module = MODULE_ID) {
  const module = game.modules?.get(_module);
  if (!module) {
    throw new Error(`Module ${_module} not found`);
  }
  return module;
}

export function getModuleApi(_module = MODULE_ID) {
  const module = getModule(_module);
  return module.api;
}

export function registerHandlebarsHelpers() {
  try {
    const hb = globalThis.Handlebars;
    if (!hb) {
      console.warn("[Magic Mana Engine] Handlebars not found to register helpers.");
      return;
    }

    if (!hb.helpers?.truncate) {
      hb.registerHelper("truncate", (text, max) => {
        const limit = Number(max) || 100;
        if (text == null) return "";
        const s = String(text);
        if (s.length <= limit) return s;
        return `${s.slice(0, limit).trimEnd()}…`;
      });
    }
  } catch (err) {
    console.error("[Magic Mana Engine] Failed to register Handlebars helpers:", err);
  }
}

export function getActiveGmId() {
  const active = game.users?.find(u => u.active && u.isGM)?.id;
  if (active) return active;
  return game.users?.find(u => u.isGM)?.id;
}

export function requireGmOrThrow() {
  if (!game.user?.isGM) throw new Error("Only the GM can perform this operation.");
}

export function hexToRGBA(hex, a = 1) {
  try {
    const c = String(hex || "").replace("#", "");
    const n = parseInt(c, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  } catch (_e) {
    return `rgba(0,0,0,${a})`;
  }
}
