import { MODULE_ID, i18nLocalize as l } from "../utils/helpers.mjs";
import { ManaManager } from "../manager/mana.manager.mjs";
import { ManaImageConfig } from "./mana-image-config.mjs";
import { COLORS } from "./constants.mjs";

export function registerSettings() {
  game.settings.registerMenu(MODULE_ID, "manaManager", {
    name: l("settings.manaManager.name", "Mana Manager"),
    label: l("settings.manaManager.label", "Open"),
    hint: l("settings.manaManager.hint", "Open the Mana Manager."),
    icon: "fas fa-flask",
    type: ManaManager,
    restricted: true,
  });

  game.settings.registerMenu(MODULE_ID, "manaImageConfig", {
    name: l("settings.manaImageConfig.name", "Mana Images"),
    label: l("settings.manaImageConfig.label", "Configure"),
    hint: l("settings.manaImageConfig.hint", "Configure the images for each mana color."),
    icon: "fas fa-image",
    type: ManaImageConfig,
    restricted: true,
  });

  for (const color of COLORS) {
    game.settings.register(MODULE_ID, `manaImage${color.key}`, {
      name: `Mana Image ${color.key}`,
      hint: `Image path for ${color.key} mana`,
      scope: "world",
      config: false,
      type: String,
      default: "",
    });
  }
}
