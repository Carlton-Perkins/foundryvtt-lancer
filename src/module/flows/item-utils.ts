import { friendly_entrytype_name } from "../config";
import { NpcFeatureType } from "../enums";
import { getAutomationOptions } from "../settings";
import { SourceData } from "../source-template";
import { FlowState } from "./flow";
import { LancerFlowState } from "./interfaces";

export async function checkItemDestroyed(
  state: FlowState<LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData | LancerFlowState.ActionUseData>
): Promise<boolean> {
  // If this automation option is not enabled, skip the check.
  if (!getAutomationOptions().limited_loading && getAutomationOptions().attacks) return true;
  if (!state.item) return true; // This flow is actor-based, so there is no item to be destroyed.
  if (
    !state.item.is_mech_weapon() &&
    !state.item.is_mech_system() &&
    !state.item.is_frame() &&
    !state.item.is_pilot_weapon() &&
    !state.item.is_npc_feature()
  ) {
    return false;
  }
  if (state.item.is_frame()) {
    return true; // Frames can't be destroyed
  }
  if (state.item.is_pilot_weapon()) {
    return true; // Pilot weapons can't be destroyed
  }
  if (state.item.system.destroyed) {
    if (
      state.item.is_mech_system() ||
      (state.item.is_npc_feature() && state.item.system.type !== NpcFeatureType.Weapon)
    ) {
      ui.notifications!.warn(`System ${state.item.name} has no remaining uses!`);
    } else {
      ui.notifications!.warn(`Weapon ${state.item.name} has no remaining uses!`);
    }
    return false;
  }
  return true;
}

export async function checkItemLimited(
  state: FlowState<LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData | LancerFlowState.ActionUseData>
): Promise<boolean> {
  // If this automation option is not enabled, skip the check.
  if (!getAutomationOptions().limited_loading && getAutomationOptions().attacks) return true;
  if (!state.item) return true; // This flow is actor-based, so there is no item to be destroyed.
  if (
    !state.item.is_mech_weapon() &&
    !state.item.is_mech_system() &&
    !state.item.is_frame() &&
    !state.item.is_weapon_mod() &&
    !state.item.is_pilot_weapon() &&
    !state.item.is_pilot_gear() &&
    !state.item.is_pilot_armor() &&
    !state.item.is_npc_feature()
  ) {
    return false;
  }
  if (state.item.is_frame()) {
    // Frames are special, we need to check for limited on the core system.
    if ((state.item.system.core_system.tags ?? []).some(t => t.is_loading)) {
      // No frames use tags, so none of them track liimited uses.
      return true;
    }
    // The frame is not limited, so we're good.
    return true;
  }
  if (state.item.isLimited() && state.item.system.uses.value <= 0) {
    let iType = friendly_entrytype_name(state.item.type);
    ui.notifications!.warn(`${iType} ${state.item.name} has no remaining uses!`);
    return false;
  }
  return true;
}

export async function checkItemCharged(
  state: FlowState<LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData | LancerFlowState.ActionUseData>
): Promise<boolean> {
  // If this automation option is not enabled, skip the check.
  if (!getAutomationOptions().limited_loading && getAutomationOptions().attacks) return true;
  if (!state.item) return true; // This flow is actor-based, so there is no item to be destroyed.
  if (
    !state.item.is_mech_weapon() &&
    !state.item.is_mech_system() &&
    !state.item.is_frame() &&
    !state.item.is_pilot_weapon() &&
    !state.item.is_npc_feature()
  ) {
    return false;
  }
  if (!state.item.is_npc_feature()) return true; // Recharge only applies to NPC features

  if (state.item.isRecharge() && !state.item.system.charged) {
    if (state.item.system.type !== NpcFeatureType.Weapon) {
      ui.notifications!.warn(`System ${state.item.name} has not recharged!`);
    } else {
      ui.notifications!.warn(`Weapon ${state.item.name} has not recharged!`);
    }
    return false;
  }
  return true;
}

export async function applySelfHeat(
  state: FlowState<
    | LancerFlowState.AttackRollData
    | LancerFlowState.WeaponRollData
    | LancerFlowState.TechAttackRollData
    | LancerFlowState.ActionUseData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  let self_heat = 0;

  if (state.data.self_heat) {
    const roll = await new Roll(state.data.self_heat).roll({ async: true });
    self_heat = roll.total!;
    state.data.self_heat_result = {
      roll,
      tt: await roll.getTooltip(),
    };
  }

  if (getAutomationOptions().attack_self_heat) {
    if (state.actor.is_mech() || state.actor.is_npc()) {
      // TODO: overkill heat to move to damage flow
      await state.actor.update({
        // @ts-ignore
        "system.heat.value": state.actor.system.heat.value + (state.data.overkill_heat ?? 0) + self_heat,
      });
    }
  }

  return true;
}

export async function updateItemAfterAction(
  state: FlowState<LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData | LancerFlowState.ActionUseData>,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  if (state.item && getAutomationOptions().limited_loading && getAutomationOptions().attacks) {
    let item_changes: DeepPartial<SourceData.MechWeapon | SourceData.NpcFeature | SourceData.PilotWeapon> = {};
    if (state.item.isLoading()) item_changes.loaded = false;
    if (state.item.isLimited()) item_changes.uses = { value: Math.max(state.item.system.uses.value - 1, 0) };
    if (state.item.is_npc_feature() && state.item.isRecharge())
      (item_changes as DeepPartial<SourceData.NpcFeature>).charged = false;
    await state.item.update({ system: item_changes });
  }
  return true;
}