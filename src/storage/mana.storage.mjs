import { MODULE_ID, i18nLocalize as l, notify } from "../utils/helpers.mjs";
import { COLORS } from "../config/constants.mjs";

export class ManaStorage {
  ensureBar(bar, slotCount) {
    const b = bar ?? { active: [], slotLocked: [], barLocked: false };
    if (!Array.isArray(b.active)) b.active = [];
    if (!Array.isArray(b.slotLocked)) b.slotLocked = [];
    if (b.active.length !== slotCount) b.active = b.active.concat(Array(slotCount).fill(false)).slice(0, slotCount);
    if (b.slotLocked.length !== slotCount) b.slotLocked = b.slotLocked.concat(Array(slotCount).fill(false)).slice(0, slotCount);
    return b;
  }

  blankState(actor) {
    const cfg = this.getActorSlotConfig(actor);
    const st = {};
    for (const c of COLORS) {
      const nRaw = Number(cfg[c.key]);
      const n = Number.isFinite(nRaw) && nRaw >= 0 ? nRaw : 5;
      st[c.key] = {
        active: Array(n).fill(false),
        slotLocked: Array(n).fill(false),
        barLocked: false,
      };
    }
    return st;
  }

  getState(actor) {
    const st = foundry.utils.deepClone(actor.getFlag(MODULE_ID, "pool") || {});
    const cfg = this.getActorSlotConfig(actor);
    const defaults = this.blankState(actor);
    for (const c of COLORS) {
      const cur = st[c.key] || {};
      const nRaw = Number(cfg[c.key]);
      const n = Number.isFinite(nRaw) && nRaw >= 0 ? nRaw : 5;
      st[c.key] = {
        active: Array.isArray(cur.active) ? cur.active.concat(Array(n).fill(false)).slice(0, n) : defaults[c.key].active,
        slotLocked: Array.isArray(cur.slotLocked) ? cur.slotLocked.concat(Array(n).fill(false)).slice(0, n) : defaults[c.key].slotLocked,
        barLocked: !!cur.barLocked,
      };
    }
    return st;
  }

  async setState(actor, st) {
    return actor.update({ [`flags.${MODULE_ID}.pool`]: st }, { render: false });
  }

  getActorSlotConfig(actor) {
    const cfg = foundry.utils.deepClone(actor.getFlag(MODULE_ID, "slotConfig") || {});
    const result = {};
    for (const c of COLORS) {
      const v = Number(cfg[c.key]);
      result[c.key] = Number.isFinite(v) && v > 0 ? v : 0;
    }
    return result;
  }

  async setActorSlotConfig(actor, newCfg) {
    const cfg = {};
    for (const c of COLORS) {
      const v = Number(newCfg?.[c.key]);
      cfg[c.key] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
    }
    await actor.update({ [`flags.${MODULE_ID}.slotConfig`]: cfg }, { render: false });

    const st = this.getState(actor);
    for (const c of COLORS) {
      const n = cfg[c.key];
      st[c.key].active = st[c.key].active.concat(Array(n).fill(false)).slice(0, n);
      st[c.key].slotLocked = st[c.key].slotLocked.concat(Array(n).fill(false)).slice(0, n);
    }
    await this.setState(actor, st);
  }

  async toggleSlot(actor, colorKey, idx) {
    const st = this.getState(actor);
    if (!st[colorKey]) return;
    if (st[colorKey].barLocked || st[colorKey].slotLocked[idx]) {
      if (!game.user.isGM) {
        return notify.warn(l("gmOnly"));
      }
    }
    st[colorKey].active[idx] = !st[colorKey].active[idx];
    await this.setState(actor, st);
  }

  async setBarLocked(actor, colorKey, v) {
    if (!game.user.isGM) {
      notify.warn(l("gmOnly"));
      return;
    }
    const st = this.getState(actor);
    st[colorKey].barLocked = !!v;
    await this.setState(actor, st);
  }

  async applyLongRestEffect(actor) {
    if (!actor) actor = game.user?.character;
    if (!actor) return;
    const st = this.getState(actor);
    for (const c of COLORS) {
      const bar = st[c.key];
      if (bar.barLocked) continue;
      const idx = bar.active.findIndex(v => v === false);
      if (idx !== -1 && !bar.slotLocked[idx]) bar.active[idx] = true;
    }
    await this.setState(actor, st);
  }

  async spendManaFromCard(actor, suit, value) {
    const st = this.getState(actor);
    const bar = st[suit];
    if (!bar) return false;
    let available = 0;
    for (let i = 0; i < bar.active.length; i++) {
      if (bar.active[i] && !bar.slotLocked[i]) available++;
    }
    if (available < value) return false;
    for (let i = bar.active.length - 1; i >= 0 && value > 0; i--) {
      if (bar.active[i] && !bar.slotLocked[i]) {
        bar.active[i] = false;
        value--;
      }
    }
    await this.setState(actor, st);
    return true;
  }
}
