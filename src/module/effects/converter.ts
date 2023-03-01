import type { LancerNPC, LancerPILOT } from "../actor/lancer-actor";
import { EntryType } from "../enums";
import type { LancerFRAME, LancerMECH_WEAPON, LancerNPC_CLASS, LancerSTATUS } from "../item/lancer-item";
import type { BonusData } from "../models/bits/bonus";
import type { SystemData } from "../system-template";
import { AE_MODE_SET_JSON } from "./lancer-active-effect";
import type { LancerActiveEffectConstructorData, LancerEffectTarget } from "./lancer-active-effect";

const FRAME_STAT_PRIORITY = 10;
const BONUS_STAT_PRIORITY = 20;
const PILOT_STAT_PRIORITY = 30;
const EFFECT_STAT_PRIORITY = 40;

// Makes an active effect for a frame.
type FrameStatKey = keyof SystemData.Frame["stats"];
type MechStatKey = keyof SystemData.Mech;
export function frameInnateEffect(frame: LancerFRAME): LancerActiveEffectConstructorData {
  let keys: Array<FrameStatKey & MechStatKey> = [
    "armor",
    "edef",
    "evasion",
    "save",
    "sensor_range",
    "size",
    "speed",
    "tech_attack",
  ];
  // @ts-expect-error Shouldn't be restricted to not take numbers I don't think
  let changes: LancerActiveEffectConstructorData["changes"] = keys.map(key => ({
    key: `system.${key}`,
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    value: frame.system.stats[key],
  }));

  // The weirder ones
  changes!.push({
    key: "system.hp.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.hp,
  });
  changes!.push({
    key: "system.structure.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.structure,
  });
  changes!.push({
    key: "system.stress.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.stress,
  });
  changes!.push({
    key: "system.heat.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.heatcap,
  });
  changes!.push({
    key: "system.repairs.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.repcap,
  });
  changes!.push({
    key: "system.loadout.sp.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.sp,
  });

  return {
    flags: { lancer: { ephemeral: true } },
    label: frame.name,
    icon: frame.img,
    origin: frame.uuid,
    transfer: true,
    changes,
  };
}

/**
 * Creates the "innate" ActiveEffect of a pilot, essentially just the buff supplied by being piloted by this mech
 * @param pilot C
 * @returns
 */
export function pilotInnateEffect(pilot: LancerPILOT): LancerActiveEffectConstructorData {
  // Bake GRIT+HASE into an active effect
  return {
    label: "Pilot Stats",
    changes: [
      // HASE
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.hull",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.hull,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.hp.max",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: 2 * pilot.system.hull + pilot.system.grit,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.repairs.max",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: Math.floor(pilot.system.hull / 2),
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.agi",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.agi,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.evasion",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.agi,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.speed",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: Math.floor(pilot.system.agi / 2),
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.sys",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.sys,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.edef",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.sys,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.tech_attack",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.sys,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.save",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.grit,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.loadout.sp.max",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: Math.floor(pilot.system.sys / 2) + pilot.system.grit,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.eng",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.eng,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.heat.max",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.eng,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.loadout.limited_bonus",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: Math.floor(pilot.system.eng / 2),
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.grit",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.grit,
      },
      // Bake the rest of the pilot source data into an active effect - TODO: Isolate to just counters or something
      /*{
        mode: AE_MODE_SET_JSON as any,
        key: "system.psd",
        // @ts-expect-error
        value: JSON.stringify(pilot.system.toObject()),
      }*/
    ],
    icon: pilot.img,
    origin: pilot.uuid,
    flags: {
      lancer: {
        target_type: EntryType.MECH,
        ephemeral: true,
      },
    },
  };
}

/**
 * Creates the ActiveEffect data for a status/condition
 */
export function statusInnateEffect(status: LancerSTATUS): LancerActiveEffectConstructorData {
  let changes: LancerActiveEffectConstructorData["changes"] = [
    {
      key: `system.statuses.${status.system.lid}`,
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      priority: EFFECT_STAT_PRIORITY,
    },
  ];
  return {
    label: status.name,
    changes,
    origin: status.uuid,
    icon: status.img,
    flags: {
      lancer: {
        ephemeral: true,
        status_type: status.system.type,
      },
      core: {
        // So it can be deleted via the ui if it is a core active effect
        statusId: status.system.lid,
      },
    },
  };
}

/**
 * Creates the pseudo-activeeffect-data that goes in the CONFIG.statusEffects variable,
 * based on a particular status
 * @param status Status to convert
 * @returns A value to be placed in CONFIG.statusEffects
 */
export function statusConfigEffect(status: LancerSTATUS): any {
  let base = statusInnateEffect(status);
  return {
    id: status.system.lid,
    label: base.label,
    changes: base.changes,
    origin: base.origin,
    icon: base.icon,
    flags: {
      lancer: {
        status_type: status.system.type,
      },
    },
  };
}

// Makes an active effect for an npc class.
type ClassStatKey = keyof SystemData.NpcClass["base_stats"][0];
type NpcStatKey = keyof SystemData.Npc;
export function npcClassInnateEffect(class_: LancerNPC_CLASS): LancerActiveEffectConstructorData {
  let keys: Array<ClassStatKey & NpcStatKey> = [
    "activations",
    "armor",
    "evasion",
    "edef",
    "speed",
    "sensor_range",
    "save",
    "hull",
    "agi",
    "sys",
    "eng",
    "size",
  ];

  let tier = (class_?.actor as LancerNPC | undefined)?.system.tier ?? 1;
  let bs = class_.system.base_stats[tier - 1];

  // @ts-expect-error Shouldn't be restricted to not take numbers I don't think
  let changes: LancerActiveEffectConstructorData["changes"] = keys.map(key => ({
    key: `system.${key}`,
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    value: bs[key],
  }));

  // The weirder ones
  changes!.push({
    key: "system.hp.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: bs.hp,
  });
  changes!.push({
    key: "system.structure.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: bs.structure,
  });
  changes!.push({
    key: "system.stress.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: bs.stress,
  });
  changes!.push({
    key: "system.heat.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: FRAME_STAT_PRIORITY,
    // @ts-expect-error
    value: bs.heatcap,
  });

  return {
    flags: { lancer: { ephemeral: true } },
    label: class_.name,
    icon: class_.img,
    origin: class_.uuid,
    transfer: true,
    changes,
  };
}

// Converts a single bonus to a single active effect
export function convertBonus(
  origin: string,
  label: string,
  bonus: BonusData
): null | LancerActiveEffectConstructorData {
  // Separate logic for "restricted" bonuses
  if (bonus.lid == "damage") {
    // TODO
  } else if (bonus.lid == "range") {
    // TODO
  } else {
    // ui.notifications?.warn("Bonus restrictions have no effect");
  }
  let changes: Required<LancerActiveEffectConstructorData["changes"]> = [];
  let disabled = false;
  let target_type: LancerEffectTarget | undefined = undefined;

  // Broadly speaking, we ignore overwrite and replace, as they are largely unused
  // However, if one or the other is set, we do tweak our AE mode as a halfhearted compatibility attempt
  let mode = bonus.replace || bonus.overwrite ? CONST.ACTIVE_EFFECT_MODES.OVERRIDE : CONST.ACTIVE_EFFECT_MODES.ADD;
  let priority = bonus.replace || bonus.overwrite ? 50 : BONUS_STAT_PRIORITY;
  let value = bonus.val;

  // First try to infer the target type.
  switch (bonus.lid) {
    // We don't yet verify points, so implementing these (which just increase "budget") doesn't help much
    // case "skill_point":
    // case "mech_skill_point":
    // case "talent_point":
    // case "license_point":
    // case "cb_point":
    // We don't yet support verifying pilot gear
    // case "pilot_gear":

    // Here's what we care about
    case "range":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.range_bonus" });
      break;
    case "damage":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.damage_bonus" });
      break;
    case "hp":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.hp.max" });
      break;
    case "armor":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.armor" });
      break;
    case "structure":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.structure.max" });
      break;
    case "stress":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.stress.max" });
      break;
    case "heatcap":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.heat.max" });
      break;
    case "repcap":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.repairs.max" });
      break;
    case "speed":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.speed" });
      break;
    case "evasion":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.evasion" });
      break;
    case "edef":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.edef" });
      break;
    case "sensor":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.sensor_range" });
      break;
    case "attack":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.bonuses.flat.range_attack" });
      break;
    case "tech_attack":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.bonuses.flat.tech_attack" });
      break;
    case "grapple":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.bonuses.flat.grapple" });
      break;
    case "ram":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.bonuses.flat.ram" });
      break;
    case "save":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.save" });
      break;
    case "sp":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.loadout.sp.max" });
      break;
    case "size":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.size" });
      break;
    case "ai_cap":
      target_type = EntryType.MECH;
      changes.push({ mode, value, priority, key: "system.ai.max" });
      break;
    case "cheap_struct":
      target_type = EntryType.MECH;
      changes.push({ mode, value: 1 as any, priority, key: "system.structure_repair_cost" });
      break;
    case "cheap_stress":
      target_type = EntryType.MECH;
      changes.push({ mode, value: 1 as any, priority, key: "system.stress_repair_cost" });
      break;
    // case "overcharge":
    // case "limited_bonus":
    case "pilot_hp":
      target_type = EntryType.PILOT;
      changes.push({ mode, value, priority, key: "system.hp.max" });
      break;
    case "pilot_armor":
      target_type = EntryType.PILOT;
      changes.push({ mode, value, priority, key: "system.armor" });
      break;
    case "pilot_evasion":
      target_type = EntryType.PILOT;
      changes.push({ mode, value, priority, key: "system.evasion" });
      break;
    case "pilot_edef":
      target_type = EntryType.PILOT;
      changes.push({ mode, value, priority, key: "system.edef" });
      break;
    case "pilot_speed":
      target_type = EntryType.PILOT;
      changes.push({ mode, value, priority, key: "system.speed" });
      break;
    case "deployable_hp":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.hp.max" });
      break;
    case "deployable_size":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.size" });
      break;
    // case "deployable_charges":
    case "deployable_armor":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.armor" });
      break;
    case "deployable_evasion":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.evasion" });
      break;
    case "deployable_edef":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.edef" });
      break;
    case "deployable_sensor_range":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.sensor_range" }); // Dumb but whatever
      break;
    case "deployable_tech_attack":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.tech_attack_bonus" }); // Dumb but whastever
      break;
    case "deployable_save":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.save" });
      break;
    case "deployable_speed":
      target_type = "only_deployable";
      changes.push({ mode, value, priority, key: "system.speed" });
      break;
    case "drone_hp":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.hp.max" });
      break;
    case "drone_size":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.size" });
      break;
    // case "drone_charges":
    case "drone_armor":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.armor" });
      break;
    case "drone_evasion":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.evasion" });
      break;
    case "drone_edef":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.edef" });
      break;
    case "drone_sensor_range":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.sensor_range" });
      break;
    case "drone_tech_attack":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.tech_attack_bonus" });
      break;
    case "drone_save":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.save" });
      break;
    case "drone_speed":
      target_type = "only_drone";
      changes.push({ mode, value, priority, key: "system.speed" });
      break;
    default:
      ui.notifications?.warn(`Bonus of type ${bonus.lid} not yet supported`);
      return null; // This effect is unsupported
  }
  // Return a normal bonus
  return {
    label,
    flags: {
      lancer: {
        target_type,
        ephemeral: true,
      },
    },
    changes,
    transfer: true,
    disabled: false,
    origin: origin,
  };
}

/**
 * Determine whether this Active Effect applies to the given weapon
 */
export function bonusAffectsWeapon(weapon: LancerMECH_WEAPON, bonus: BonusData): boolean {
  if (!weapon.is_mech_weapon()) return false;
  let sel_prof = weapon.system.active_profile;

  // Now start checking
  if (bonus.weapon_sizes?.[weapon.system.size] === false) return false;
  if (bonus.weapon_types?.[sel_prof.type] === false) return false;
  if (!sel_prof.damage.some(d => bonus.damage_types?.[d.type] === false)) return false;
  if (!sel_prof.range.some(d => bonus.range_types?.[d.type] === false)) return false;

  // Passed the test
  return true;
}
