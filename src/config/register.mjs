import { MODULE_ID, i18nLocalize as l } from "../utils/helpers.mjs";
import { ManaManager } from "../manager/mana.manager.mjs";

export function registerSettings() {
  game.settings.registerMenu(MODULE_ID, "manaManager", {
    name: l("settings.manaManager.name", "Mana Manager"),
    label: l("settings.manaManager.label", "Open"),
    hint: l("settings.manaManager.hint", "Open the Mana Manager."),
    icon: "fas fa-flask",
    type: ManaManager,
    restricted: true,
  });
}
