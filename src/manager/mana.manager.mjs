import { MODULE_ID, i18nLocalize as l, HandlebarsApplication } from "../utils/helpers.mjs";
import { ManaStorage } from "../storage/mana.storage.mjs";
import { COLORS } from "../config/constants.mjs";

export class ManaManager extends HandlebarsApplication {
  static get APP_ID() {
    return this.name
      .split(/(?=[A-Z])/)
      .join("-")
      .toLowerCase();
  }

  get APP_ID() {
    return this.constructor.APP_ID;
  }

  static get DEFAULT_OPTIONS() {
    return {
      classes: ["mana-manager"],
      tag: "div",
      window: {
        frame: true,
        positioned: true,
        title: l("manager.title"),
        icon: "fas fa-flask",
        controls: [],
        minimizable: true,
        resizable: false,
        contentTag: "section",
        contentClasses: [],
      },
      actions: {},
      form: {
        handler: undefined,
        submitOnChange: false,
        closeOnSubmit: false,
      },
      position: {
        width: "auto",
        height: "auto",
      },
    };
  }

  static get PARTS() {
    return {
      content: {
        template: `modules/${MODULE_ID}/templates/mana.manager.hbs`,
        scrollable: [],
        classes: [],
      },
    };
  }

  get title() {
    return l("manager.title", "Mana Manager");
  }

  constructor(options = {}) {
    super(options);
    this.search = "";
    this.selectedActorId = null;
    this.storage = new ManaStorage();
    this._searchDebounce = null;
  }

  async _prepareContext(options) {
    const allActors = Array.from(game.actors?.values?.() || []);
    const filtered = this.search ? allActors.filter(a => a.name.toLowerCase().includes(this.search.toLowerCase())) : allActors;

    const selected = filtered.find(a => a.id === this.selectedActorId) || null;

    const slotConfig = selected ? this.storage.getActorSlotConfig(selected) : null;

    return {
      isGM: game.user.isGM,
      search: this.search,
      actors: filtered.map(a => ({ id: a.id, name: a.name })),
      selectedActorId: selected?.id || "",
      slotConfig,
      colors: COLORS.map(c => ({
        key: c.key,
        name: l(`color.${c.key}`),
      })),
    };
  }

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const root = this.element;

    root.querySelector("input[name='search']")?.addEventListener("input", ev => {
      this.search = ev.currentTarget.value || "";
      this._refreshActorSelect(root);
    });

    this._refreshActorSelect(root);

    root.querySelector("select[name='actor']")?.addEventListener("change", ev => {
      this.selectedActorId = ev.currentTarget.value || null;
      this.render(true);
    });

    root.querySelector(".mana-save")?.addEventListener("click", async ev => {
      ev.preventDefault();
      const actor = game.actors?.get?.(this.selectedActorId);
      if (!actor) return ui.notifications.warn(l("manager.selectActor"));

      const cfg = {};
      root.querySelectorAll(".mana-input[data-color]").forEach(el => {
        const key = el.dataset.color;
        cfg[key] = Number(el.value) || 0;
      });

      await this.storage.setActorSlotConfig(actor, cfg);
      ui.notifications.info(l("manager.saveSuccess"));
      this.render(true);
    });

    const clamp = x => {
      const n = Number(x);
      const base = Number.isFinite(n) ? n : 0;
      return Math.min(100, Math.max(0, base));
    };

    root.querySelectorAll(".mana-range[data-color]").forEach(range => {
      const key = range.dataset.color;
      const number = root.querySelector(`.mana-input[data-color="${key}"]`);
      const initial = clamp(number?.value);
      if (number) number.value = String(initial);
      range.value = String(initial);

      range.addEventListener("input", e => {
        const v = clamp(e.currentTarget.value);
        if (number) number.value = String(v);
      });
    });

    root.querySelectorAll(".mana-input[data-color]").forEach(number => {
      const key = number.dataset.color;
      const range = root.querySelector(`.mana-range[data-color="${key}"]`);

      number.setAttribute("min", "0");
      number.setAttribute("max", "100");
      number.setAttribute("step", "1");

      const initial = clamp(number.value);
      number.value = String(initial);
      if (range) range.value = String(initial);

      number.addEventListener("input", e => {
        const v = clamp(e.currentTarget.value);
        number.value = String(v);
        if (range) range.value = String(v);
      });
    });
  }

  _getFilteredActors() {
    const allActors = Array.from(game.actors?.values?.() || []);
    const filtered = this.search ? allActors.filter(a => (a.name || "").toLowerCase().includes(this.search.toLowerCase())) : allActors;

    if (this.selectedActorId && !filtered.some(a => a.id === this.selectedActorId)) {
      const current = allActors.find(a => a.id === this.selectedActorId);
      if (current) filtered.unshift(current);
    }
    return filtered;
  }

  _refreshActorSelect(root) {
    const select = root.querySelector("select[name='actor']");
    if (!select) return;

    const currentValue = this.selectedActorId || "";

    const actors = this._getFilteredActors();
    select.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Selecione um ator";
    select.appendChild(defaultOpt);

    for (const a of actors) {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      select.appendChild(opt);
    }

    if (currentValue && actors.some(a => a.id === currentValue)) {
      select.value = currentValue;
    } else {
      select.value = "";
      this.selectedActorId = null;
      select.selectedIndex = 0;
    }
  }
}
