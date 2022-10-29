import { SystemType, WeaponSize, WeaponType } from "../../enums";

// @ts-ignore
const fields: any = foundry.data.fields;

export enum SynergyLocations {
  Any,
  ActiveEffects,
  Rest,
  Weapon,
  System,
  Move,
  Boost,
  Other,
  Ram,
  Grapple,
  TechAttack,
  Overcharge,
  Skill_check,
  Overwatch,
  ImprovisedAttack,
  Disengage,
  Stabilize,
  Tech,
  Lock_on,
  Hull,
  Agility,
  Systems,
  Engineering,
}

export interface SynergyData {
  locations: SynergyLocations[];
  detail: string;
  system_types?: Array<SystemType | "any">;
  weapon_types?: Array<WeaponType | "any">;
  weapon_sizes?: Array<WeaponSize | "any">;
}

export class SynergyField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        locations: new fields.ArrayField(
          new fields.StringField({ choices: Object.values(SynergyLocations), initial: SynergyLocations.Any })
        ),
        detail: new fields.StringField({ nullable: false }),
        system_types: new fields.ArrayField(
          new fields.StringField({ choices: Object.values(SystemType), initial: SystemType.System })
        ),
        weapon_types: new fields.ArrayField(
          new fields.StringField({ choices: Object.values(WeaponType), initial: WeaponType.Rifle })
        ),
        weapon_sizes: new fields.ArrayField(
          new fields.StringField({ choices: Object.values(WeaponSize), initial: WeaponSize.Main })
        ),
      },
      options
    );
  }
}