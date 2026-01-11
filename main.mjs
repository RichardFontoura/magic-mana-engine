import { registerSettings } from "./src/config/register.mjs";
import { ManaStorage } from "./src/storage/mana.storage.mjs";
import { registerHooks } from "./src/hooks/mana.hooks.mjs";

Hooks.once("init", () => {
  registerSettings();
  const storage = new ManaStorage();
  registerHooks(storage);
});
