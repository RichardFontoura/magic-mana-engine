import { i18nLocalize as l } from "../utils/helpers.mjs";
import { hexToRGBA } from "../utils/helpers.mjs";
import { COLORS } from "../config/constants.mjs";

export class ManaViewer {
  constructor(storage) {
    this.storage = storage;
  }

  async render(actor, $container, options) {
    const { slotCountByColor, icons, onToggleSlot, onToggleBarLock } = options;
    const state = this.storage.getState(actor);
    $container.empty();

    for (const c of COLORS) {
      const colorKey = c.key;
      const icon = icons?.[colorKey] ?? "";
      const slotCount = Number(slotCountByColor?.[colorKey]);
      const bar = this.storage.ensureBar(state[colorKey], slotCount);
      const isBarLocked = !!bar.barLocked;

      const $bar = $(`<div class="wmp-bar ${isBarLocked ? "locked" : ""}" style="--wmp-color:${c.hex}; background: ${hexToRGBA(c.hex, 0.7)}"></div>`);
      const human = l(`color.${colorKey}`);
      const $header = $(`<div class="wmp-header"><div class="wmp-title">${human}</div></div>`);
      const $lockBtn = $(
        `<div class="wmp-lock"><i class="fas fa-lock${isBarLocked ? "" : "-open"}"></i> ${isBarLocked ? l("gmUnlockBar") : l("gmLockBar")}</div>`
      );

      if (game.user.isGM) {
        $lockBtn.on("click", async () => onToggleBarLock(colorKey, !bar.barLocked));
        $header.append($lockBtn);
      } else if (isBarLocked) {
        $header.append($(`<div class="wmp-note">${l("gmLocked")}</div>`));
      }
      $bar.append($header);

      const $slots = $(`<div class="wmp-slots"></div>`);
      let $currentRow = null;
      for (let i = 0; i < slotCount; i++) {
        if (i % 10 === 0) {
          $currentRow = $(`<div class="wmp-row"></div>`);
          $slots.append($currentRow);
        }
        const active = !!bar.active[i];
        const locked = !!bar.slotLocked[i] || isBarLocked;
        const $slot = $(`<div class="wmp-slot ${active ? "active" : ""} ${locked ? "locked" : ""}" data-idx="${i}"><div class="icon"></div></div>`);

        const $icon = $slot.find(".icon");
        if (active) {
          if (icon) $icon.css("background-image", `url("${icon}")`);
          else $icon.css("background", c.hex);
        } else {
          $icon.css("background", "transparent");
        }

        $slot.on("click", async () => {
          if (isBarLocked && !game.user.isGM) return;
          let next = -1;
          for (let j = 0; j < slotCount; j++) {
            if (!bar.active[j] && !bar.slotLocked[j]) {
              next = j;
              break;
            }
          }
          if (next === -1) return;
          await onToggleSlot(colorKey, next);
        });

        $slot.on("contextmenu", async ev => {
          ev.preventDefault();
          if (isBarLocked && !game.user.isGM) return;
          let last = -1;
          for (let j = slotCount - 1; j >= 0; j--) {
            if (bar.active[j] && !bar.slotLocked[j]) {
              last = j;
              break;
            }
          }
          if (last === -1) return;
          await onToggleSlot(colorKey, last);
        });

        $currentRow.append($slot);
      }

      $bar.append($slots);
      $container.append($bar);
    }
  }
}
