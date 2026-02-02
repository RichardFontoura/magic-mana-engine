import { MODULE_ID, i18nLocalize as l, HandlebarsApplication, FilePicker } from "../utils/helpers.mjs";
import { COLORS } from "./constants.mjs";

export class ManaImageConfig extends HandlebarsApplication {
  static get APP_ID() {
    return "mana-image-config";
  }

  get APP_ID() {
    return this.constructor.APP_ID;
  }

  static get DEFAULT_OPTIONS() {
    return {
      classes: ["mana-image-config"],
      tag: "div",
      window: {
        frame: true,
        positioned: true,
        title: l("imageConfig.title"),
        icon: "fas fa-image",
        controls: [],
        minimizable: true,
        resizable: false,
        contentTag: "section",
        contentClasses: [],
      },
      actions: {
        save: ManaImageConfig.prototype._onSave,
      },
      form: {
        handler: undefined,
        submitOnChange: false,
        closeOnSubmit: false,
      },
      position: {
        width: 600,
        height: "auto",
      },
    };
  }

  static get PARTS() {
    return {
      content: {
        template: `modules/${MODULE_ID}/templates/mana.image-config.hbs`,
        scrollable: [],
        classes: [],
      },
    };
  }

  get title() {
    return l("imageConfig.title", "Mana Image Configuration");
  }

  constructor(options = {}) {
    super(options);
    this.images = {};
    for (const c of COLORS) {
      const settingKey = `manaImage${c.key}`;
      this.images[c.key] = game.settings.get(MODULE_ID, settingKey) || "";
    }
  }

  async _prepareContext(options) {
    return {
      isGM: game.user.isGM,
      colors: COLORS.map(c => ({
        key: c.key,
        name: l(`color.${c.key}`),
        image: this.images[c.key] || "",
      })),
    };
  }

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const root = this.element;

    root.querySelectorAll(".file-picker-btn").forEach(btn => {
      btn.addEventListener("click", event => {
        const colorKey = event.currentTarget.getAttribute("data-color");
        const input = root.querySelector(`input[name="image-${colorKey}"]`);

        try {
          new FilePicker({
            type: "imagevideo",
            current: this.images[colorKey] || "",
            callback: path => {
              this.images[colorKey] = path;
              if (input) input.value = path;
              this.render(true);
            },
          }).browse();
        } catch (err) {
          console.error("Failed to open FilePicker:", err);
          ui.notifications.error(l("imageConfig.filePickerError", "Failed to open file picker"));
        }
      });
    });

    root.querySelectorAll(".clear-image-overlay").forEach(btn => {
      btn.addEventListener("click", event => {
        const colorKey = event.currentTarget.getAttribute("data-color");
        const input = root.querySelector(`input[name="image-${colorKey}"]`);
        this.images[colorKey] = "";
        if (input) input.value = "";
        this.render(true);
      });
    });

    root.querySelectorAll(".image-path-input").forEach(input => {
      const colorKey = input.name.replace("image-", "");
      input.addEventListener("change", event => {
        this.images[colorKey] = event.target.value;
      });
    });
  }

  async _onSave(event, target) {
    event.preventDefault();

    for (const c of COLORS) {
      const value = this.images[c.key] || "";
      const settingKey = `manaImage${c.key}`;
      await game.settings.set(MODULE_ID, settingKey, value);
    }

    this._refreshAllActorSheets();

    ui.notifications.info(l("imageConfig.saveSuccess", "Image configuration saved"));
    this.close();
  }

  _refreshAllActorSheets() {
    for (const app of Object.values(ui.windows)) {
      if (app instanceof ActorSheet) {
        app.render(false);
      }
    }
  }
}
