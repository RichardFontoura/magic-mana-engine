import { MODULE_ID, i18nLocalize as l, i18nLocalizeFormat as lf, notify } from "../utils/helpers.mjs";
import { ManaViewer } from "../viewer/mana.viewer.mjs";

const playedPiles = ["table", "played", "mesa"];

export function registerHooks(storage) {
  const viewer = new ManaViewer(storage);

  Hooks.on("renderActorSheet", async (sheet, html) => {
    const actor = sheet.actor;
    if (!actor?.system?.attributes) return;

    const nav = html.find("nav.sheet-tabs[data-group='primary'], .sheet-navigation");
    const body = html.find(".sheet-body");

    const isGM = game.user.isGM;
    const isOwner = actor.isOwner;
    if (!isGM && !isOwner) return;
    if (!nav.length || !body.length) return;

    if (!nav.find(`[data-tab='wmp-mana']`).length) {
      const tabBtn = $(`<a class="item" data-tab="wmp-mana" data-group="primary"><i class="fa-duotone fa-light fa-flask-round-potion"></i></a>`);
      const items = nav.find(".item");
      if (items.length >= 1) $(items[items.length - 1]).before(tabBtn);
      else nav.append(tabBtn);
    }

    if (!body.find(".tab.wmp-mana").length) {
      const tabContent = $(`<div class="tab wmp-mana" data-tab="wmp-mana" data-group="primary"><div class="wmp-mana"></div></div>`);
      body.append(tabContent);
    }

    const manaTab = body.find(".tab.wmp-mana");
    manaTab.hide();

    const adjustScrollArea = () => {
      try {
        const $container = body.find(".tab.wmp-mana .wmp-mana");
        const h = Math.max(0, body.innerHeight?.() ?? body.height?.() ?? 0);
        if ($container.length && h > 0) {
          $container.css({
            "max-height": `${h}px`,
            "overflow-y": "auto",
          });
          manaTab.css({
            height: `${h}px`,
            overflow: "hidden",
          });
        }
      } catch (e) {
        console.debug("magic-mana-engine", "adjustScrollArea failed", e);
      }
    };

    nav.off("click.wmpMana").on("click.wmpMana", ".item", ev => {
      const clickedTab = $(ev.currentTarget).data("tab");
      if (clickedTab === "wmp-mana") {
        manaTab.show();
        adjustScrollArea();
      } else {
        manaTab.hide();
      }
    });

    const currentActive = nav.find(".item.active").data("tab");
    if (currentActive === "wmp-mana") {
      manaTab.show();
      adjustScrollArea();
    } else manaTab.hide();

    const $container = body.find(".tab.wmp-mana .wmp-mana");

    const icons = {};
    for (const color of ["W", "U", "B", "R", "G", "C", "P"]) {
      const settingKey = `manaImage${color}`;
      icons[color] = game.settings.get(MODULE_ID, settingKey) || "";
    }

    const slotCountByColor = storage.getActorSlotConfig(actor);

    const reRender = () => viewer.render(actor, $container, handlers);

    const handlers = {
      slotCountByColor,
      icons,
      onToggleSlot: async (colorKey, i) => {
        await storage.toggleSlot(actor, colorKey, i);
        reRender();
      },
      onToggleBarLock: async (colorKey, v) => {
        await storage.setBarLocked(actor, colorKey, v);
        reRender();
      },
    };

    await viewer.render(actor, $container, handlers);

    try {
      const el = html?.[0];
      if (el) {
        const ro = new ResizeObserver(() => adjustScrollArea());
        ro.observe(el);
      }
    } catch (e) {
      console.debug(MODULE_ID, "ResizeObserver not available", e);
    }

    try {
      sheet._tabs?.forEach(t => t.bind(html[0]));
    } catch (e) {
      console.debug(MODULE_ID, "tab bind failed", e);
    }
  });

  Hooks.on("pf2e.restForTheNight", async actor => {
    try {
      await storage.applyLongRestEffect(actor);
    } catch (e) {
      console.debug(MODULE_ID, e);
    }
  });

  Hooks.on("updateCard", async (card, change, options, userId) => {
    try {
      if (!("parent" in change || "faceup" in change || "flags" in change)) return;

      const user = game.users.get(userId);
      const actor = user?.character;
      if (!actor) return notify.warn(l("chat.noActor"));

      const suit = (card.suit || card.system?.suit || card.getFlag?.("core", "suit") || "").toString().toUpperCase();
      const value = Number(card.value || card.system?.value || card.getFlag?.("core", "value") || 0);
      if (!["W", "U", "B", "R", "G"].includes(suit) || !Number.isFinite(value) || value <= 0) return;

      const parentName = card.parent?.name?.toLowerCase?.() || "";
      if (!playedPiles.some(n => parentName.includes(n))) return;

      const ok = await storage.spendManaFromCard(actor, suit, value);
      const colorHuman = l(`color.${suit}`);
      const playerName = user?.name || actor?.name || "Jogador";
      const cardName = card.name ?? "Carta";

      if (!ok) {
        ChatMessage.create({
          content: `<p>${lf("chat.fail", {
            player: playerName,
            card: cardName,
            color: colorHuman,
          })}</p>`,
        });
      } else {
        ChatMessage.create({
          content: `<p>${lf("chat.success", {
            player: playerName,
            card: cardName,
            value,
            color: colorHuman,
          })}</p>`,
        });
      }
    } catch (e) {
      console.debug(MODULE_ID, e);
    }
  });

  Hooks.on("updateActor", async (actor, change, options, userId) => {
    try {
      const poolChanged =
        foundry.utils.getProperty(change, `flags.${MODULE_ID}.pool`) !== undefined ||
        (change?.flags && change.flags[MODULE_ID] && "pool" in change.flags[MODULE_ID]) ||
        foundry.utils.getProperty(change, `flags.${MODULE_ID}.slotConfig`) !== undefined;
      if (!poolChanged) return;

      const apps = Object.values(actor?.apps || {});
      const gameActor = game.actors?.get?.(actor.id);
      const altApps = apps.length ? [] : Object.values(gameActor?.apps || {});
      const targetApps = apps.length ? apps : altApps;

      for (const app of targetApps) {
        const htmlEl = app?.element?.length ? app.element : $("body");
        const $container = htmlEl.find(".tab.wmp-mana .wmp-mana");
        if (!$container.length) continue;

        const icons = {};
        for (const color of ["W", "U", "B", "R", "G", "C", "P"]) {
          const settingKey = `manaImage${color}`;
          icons[color] = game.settings.get(MODULE_ID, settingKey) || "";
        }

        const slotCountByColor = storage.getActorSlotConfig(actor);

        const reRender = () => viewer.render(actor, $container, handlers);

        const handlers = {
          slotCountByColor,
          icons,
          onToggleSlot: async (colorKey, i) => {
            await storage.toggleSlot(actor, colorKey, i);
            reRender();
          },
          onToggleBarLock: async (colorKey, v) => {
            await storage.setBarLocked(actor, colorKey, v);
            reRender();
          },
        };

        await viewer.render(actor, $container, handlers);
      }
    } catch (e) {
      console.debug(MODULE_ID, e);
    }
  });
}
