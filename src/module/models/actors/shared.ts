import { CounterField } from "../bits/counter.js";
import { DamageField } from "../bits/damage.js";
import { FakeBoundedNumberField, LIDField } from "../shared.js";
const fields: any = foundry.data.fields;

/**
 * Tracks core statuses, and allows for active effects to easily and non-exclusively apply impaired.
 * We use the names of keys from lancer-data, but with dashes removed
 */
export interface StatConMap {
  // wip
  // statuses
  dangerzone: boolean;
  downandout: boolean;
  engaged: boolean;
  exposed: boolean;
  invisible: boolean;
  prone: boolean;
  shutdown: boolean;

  // conditions
  immobilized: boolean;
  impaired: boolean;
  jammed: boolean;
  lockon: boolean;
  shredded: boolean;
  slow: boolean;
  stunned: boolean;
}

// We implement our templates here
export function template_universal_actor() {
  return {
    lid: new LIDField(),
    burn: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
    activations: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 1 }),
    custom_counters: new fields.ArrayField(new CounterField()),

    hp: new FakeBoundedNumberField({ integer: true, nullable: false, initial: 0 }),
    overshield: new FakeBoundedNumberField({ integer: true, nullable: false, initial: 0 }),

    // Our derived property melange - not actually here! We generate those in prepareData
  };
}

export function template_action_tracking() {
  return {
    action_tracker: new fields.SchemaField({
      protocol: new fields.BooleanField(),
      move: new fields.NumberField({ min: 0, integer: true, nullable: false }),
      full: new fields.BooleanField(),
      quick: new fields.BooleanField(),
      reaction: new fields.BooleanField(),
      free: new fields.BooleanField(),
      used_reactions: new fields.ArrayField(new fields.StringField({ nullable: false })), // lids
    }),
  };
}

export function template_heat() {
  return {
    heat: new FakeBoundedNumberField({ integer: true, nullable: false, initial: 0 }),
  };
}

export function template_struss() {
  return {
    stress: new FakeBoundedNumberField({ integer: true, nullable: false, initial: 0 }),
    structure: new FakeBoundedNumberField({ integer: true, nullable: false, initial: 0 }),
  };
}

export function template_statuses() {
  // Empty by design - these are all derived, so we don't want to track them
  return {};
}
