import { getTrackerAppearance, setAppearance } from "lancer-initiative";
import type { LancerCombat, LancerCombatant } from "lancer-initiative";
import { LANCER } from "./config.js";
import { AutomationConfig } from "./apps/settings/automation-settings.js";
import CompconLoginForm from "./helpers/compcon-login-form.js";
import { ActionTrackerConfig } from "./apps/settings/action-tracker-settings.js";

export const registerSettings = function () {
  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register(game.system.id, LANCER.setting_migration, {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0",
  });

  game.settings.register(game.system.id, LANCER.setting_core_data, {
    name: "Lancer Data Version",
    scope: "world",
    config: false,
    type: String,
    // Toggle for dev swapping to test import.
    default: "0.0.0",
    // default: "3.0.21",
  });

  game.settings.register(game.system.id, LANCER.setting_lcps, {
    name: "Installed LCPs",
    scope: "world",
    config: false,
    // @ts-ignore There's probably a fix for this
    type: Object,
    default: { index: [] },
  });

  game.settings.register(game.system.id, LANCER.setting_tag_config, {
    name: "Tags",
    scope: "world",
    config: false,
    // @ts-ignore There's probably a fix for this
    type: Object,
    default: {},
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_compcon_login, {
    name: "Comp/Con Login",
    label: "Log in to Comp/Con",
    hint: "Log in to Comp/Con to automatically load any pilots and mechs you have access to",
    icon: "fas fa-bars",
    type: CompconLoginForm,
    restricted: false,
  });

  game.settings.registerMenu(game.system.id, "AutomationMenu", {
    name: "lancer.automation.menu-name",
    label: "lancer.automation.menu-label",
    hint: "lancer.automation.menu-hint",
    icon: "mdi mdi-state-machine",
    type: AutomationConfig,
    restricted: true,
  });

  game.settings.registerMenu(game.system.id, "ActionTrackerMenu", {
    name: "lancer.actionTracker.menu-name",
    label: "lancer.actionTracker.menu-label",
    hint: "lancer.actionTracker.menu-hint",
    icon: "mdi mdi-state-machine",
    type: ActionTrackerConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_stock_icons, {
    name: "Keep Stock Icons",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(game.system.id, LANCER.setting_welcome, {
    name: "Hide Welcome Message",
    hint: "Hide the welcome message for the latest update to the Lancer system.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(game.system.id, LANCER.setting_square_grid_diagonals, {
    name: "lancer.squaregriddiagonals.name",
    hint: "lancer.squaregriddiagonals.hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "111": "lancer.squaregriddiagonals.111",
      "121": "lancer.squaregriddiagonals.121",
      "222": "lancer.squaregriddiagonals.222",
      euc: "lancer.squaregriddiagonals.euc",
    },
    default: "111",
  });

  game.settings.register(game.system.id, LANCER.setting_automation, {
    scope: "world",
    config: false,
    type: Object,
    default: getAutomationOptions(true),
  });

  game.settings.register(game.system.id, LANCER.setting_actionTracker, {
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });

  game.settings.register(game.system.id, LANCER.setting_dsn_setup, {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  // Lancer initiative stuff
  CONFIG.LancerInitiative = {
    module: game.system.id,
    templatePath: `systems/${game.system.id}/templates/combat/combat-tracker.hbs`,
    def_appearance: {
      icon: "cci cci-activate",
      icon_size: 2,
      player_color: "#44abe0",
      friendly_color: "#44abe0",
      neutral_color: "#146464",
      enemy_color: "#d98f30",
      done_color: "#444444",
    },
    activations: "system.activations",
  };
  game.settings.register(game.system.id, "combat-tracker-appearance", {
    scope: "world",
    config: false,
    type: Object,
    onChange: setAppearance,
    default: {},
  });
  game.settings.register(game.system.id, "combat-tracker-sort", {
    scope: "world",
    config: false,
    type: Boolean,
    onChange: v => {
      CONFIG.LancerInitiative.sort = v as boolean;
      game.combats?.render();
    },
    default: true,
  });
  Hooks.callAll("LancerInitiativeInit");
  setAppearance(getTrackerAppearance());
};

// > GENERAL AUTOMATION
/**
 * Retrieve the automation settings for the system. If automation is turned
 * off, all keys will be `false`.
 * @param useDefault - Control if the returned value is the default.
 *                     (default: `false`)
 */
export function getAutomationOptions(useDefault = false): AutomationOptions {
  const def: AutomationOptions = {
    enabled: true,
    attacks: true,
    structure: true,
    overcharge_heat: true,
    attack_self_heat: true,
    limited_loading: true,
    remove_templates: false,
  };
  if (useDefault) return def;
  const settings = (game.settings.get(game.system.id, LANCER.setting_automation) as Record<string, boolean>) ?? {};
  if (settings == null || (typeof settings == "object" && settings.enabled)) {
    return {
      ...def,
      ...settings,
    };
  } else {
    // Return all falses if automation is off
    return {
      enabled: false,
      attacks: false,
      structure: false,
      overcharge_heat: false,
      attack_self_heat: false,
      limited_loading: false,
      remove_templates: false,
    };
  }
}

/**
 * Object for the various automation settings in the system
 */
export interface AutomationOptions {
  /**
   * Master switch for automation
   * @defaultValue `true`
   */
  enabled: boolean;
  /**
   * Toggle for whether or not you want the system to auto-calculate hits,
   * damage, and other attack related checks.
   * @defaultValue `true`
   */
  attacks: boolean;
  /**
   * When a mech rolls a structure/overheat macro, should it automatically
   * decrease structure/stress?
   * @defaultValue `true`
   */
  structure: boolean;
  /**
   * When a mech rolls an overcharge, should it automatically apply heat?
   * @defaultValue `true`
   */
  overcharge_heat: boolean;
  /**
   * When a mech rolls an attack with heat (self) and/or overkill, should it
   * automatically apply heat?
   * @defaultValue `true`
   */
  attack_self_heat: boolean;
  /**
   * Handle limited/loading items automatically, or leave that up to the user
   * @defaultValue `true`
   */
  limited_loading: boolean;
  /**
   * Remove measured templates created by attacks when the turn changes
   * @defaultValue `false`
   */
  remove_templates: boolean;
}

//
// > ACTION TRACKER AUTOMATION
/**
 * Retrieve the automation settings for the system. If automation is turned
 * off, all keys will be `false`.
 * @param useDefault - Control if the returned value is the default.
 *                     (default: `false`)
 */
export function getActionTrackerOptions(useDefault = false): ActionTrackerOptions {
  const def: ActionTrackerOptions = {
    showHotbar: true,
    allowPlayers: true,
    printMessages: false,
  };
  if (useDefault) return def;
  const set = game.settings.get(game.system.id, LANCER.setting_actionTracker) as Partial<ActionTrackerOptions>;
  return {
    ...def,
    ...set,
  };
}

/**
 * Object for the various automation settings in the system
 */
export interface ActionTrackerOptions {
  /**
   * Whether the hotbar should be displayed.
   * @defaultValue `true`
   */
  showHotbar: boolean;
  /**
   * Whether the players (non-GMs) can modify actions.
   * @defaultValue `true`
   */
  allowPlayers: boolean;
  /**
   * Whether to print turn start/end chat messages.
   * @defaultValue `true`
   */
  printMessages: boolean;
}
//
// > GLOBALS
declare global {
  interface DocumentClassConfig {
    Combat: typeof LancerCombat;
    Combatant: typeof LancerCombatant;
  }
}
