import { EntryType, ReserveType } from "../../enums";
import { restrict_enum } from "../../helpers/commons";
import { dataTransfer } from "../../helpers/slidinghud/is-dragging";
import type { SourceData } from "../../source-template";
import type { PackedReserveData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { unpackSynergy } from "../bits/synergy";
import type { LancerDataModel, UnpackContext } from "../shared";
import { template_bascdt, template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class ReserveModel extends LancerDataModel {
  static defineSchema() {
    return {
      consumable: new fields.BooleanField(),
      label: new fields.StringField(),
      resource_name: new fields.StringField(),
      resource_note: new fields.StringField(),
      resource_cost: new fields.StringField(),
      type: new fields.StringField({ choices: Object.values(ReserveType), initial: ReserveType.Tactical }),
      used: new fields.BooleanField(),
      description: new fields.HTMLField(),
      ...template_universal_item(),
      ...template_bascdt(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackReserve(
  data: PackedReserveData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.RESERVE;
  system: DeepPartial<SourceData.Reserve>;
} {
  return {
    name: data.name ?? data.label ?? "Unnamed Reserve",
    type: EntryType.RESERVE,
    system: {
      lid: data.id,
      description: data.description,
      actions: data.actions?.map(unpackAction),
      bonuses: data.bonuses?.map(unpackBonus),
      consumable: data.consumable,
      counters: data.counters?.map(unpackCounter),
      deployables: data.deployables?.map(d => unpackDeployable(d, context)),
      integrated: data.integrated,
      label: data.label,
      resource_cost: data.resource_cost,
      resource_name: data.resource_name,
      resource_note: data.resource_note,
      synergies: data.synergies?.map(unpackSynergy),
      tags: undefined,
      type: restrict_enum(ReserveType, ReserveType.Tactical, data.type),
      used: data.used,
    },
  };
}
