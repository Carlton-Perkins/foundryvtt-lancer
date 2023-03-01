import type { HelperOptions } from "handlebars";
import { TypeIcon } from "../config";
import { LancerItem } from "../item/lancer-item";
import type {
  LancerItemType,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_FEATURE,
  LancerPILOT_GEAR,
  LancerPILOT_WEAPON,
  LancerWEAPON_MOD,
  LancerRESERVE,
} from "../item/lancer-item";
import { array_path_edit_changes, drilldownDocument, resolve_helper_dotpath } from "./commons";
import { HANDLER_enable_doc_dropping, HANDLER_enable_dragging } from "./dragdrop";
import type { FoundryDropData, ResolvedDropData } from "./dragdrop";
import { framePreview, license_ref, mech_weapon_display as mechWeaponView, npc_feature_preview } from "./item";
import { mech_system_view as mechSystemView } from "./loadout";
import type { LancerDoc } from "../util/doc";
import { EntryType } from "../enums";
import { LancerActor } from "../actor/lancer-actor";
import { coreBonusView, skillView, talent_view as talentView } from "./pilot";
import { LancerActiveEffect } from "../effects/lancer-active-effect";
import type { SourceData } from "../source-template";

/*
"Ref" manifesto - Things for handling everything in data that is either a ResolvedUuidRefField or ResolvedEmbeddedRefField.

.ref - Signals that it is a ref, more of a marker class than anything
  .set - Signals that the ref currently has a value
  .slot - Styling indicator for an empty ref slot. Almost if not always drop-settable

  .drop-settable - Signals that the ref can be set via a drag event

data-uuid ~= "Actor.293180213" = UUID (even if embed) of the item, if .set
data-accept-types ~= "<Type1> <Type2> ..." = Space-separated list of EntryTypes to accept
data-mode = RefMode = How the ref, if it is a slot, should be set.

helper options:
 - value=??? = An override of what to show. Instead of showing what the path is resolved to, show this
*/

// Creates the params common to all refs, essentially just the html-ified version of a RegRef
export function ref_params(doc: LancerDoc, path?: string) {
  if (path) {
    return ` data-uuid="${doc.uuid}" data-path="${path}" `;
  } else {
    return ` data-uuid="${doc.uuid}" `;
  }
}

// A small, visually appealing slot for indicating where an item can go / is
// If a slot_path is provided, then this will additionally be a valid drop-settable location for items of this type
export function simple_ref_slot(path: string = "", accept_types: string | EntryType[], _options: HelperOptions) {
  // Format types
  let flat_types: string;
  let arr_types: EntryType[];
  if (Array.isArray(accept_types)) {
    arr_types = accept_types;
    flat_types = accept_types.join(" ");
  } else {
    arr_types = accept_types.split(" ") as EntryType[];
    flat_types = accept_types;
  }

  // Get present value
  let doc = _options.hash["value"] ?? (resolve_helper_dotpath(_options, path) as LancerDoc);

  if (!doc || doc.status == "missing") {
    // Show an icon for each accepted type
    let icons = (arr_types || ["dummy"]).filter(t => t).map(t => `<img class="ref-icon" src="${TypeIcon(t)}"></img>`);

    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="ref ref-card slot" 
                 data-accept-types="${flat_types}"
                 data-path="${path}">
          ${icons.join(" ")}
          <span class="major">Empty</span>
      </div>`;
  } else if (doc.then !== undefined) {
    return `<span>ASYNC not handled yet</span>`;
  } else {
    // The data-type
    return `<div class="ref ref-card set click-open" 
                  data-accept-types="${flat_types}"
                  data-path="${path}"
                  ${ref_params(doc)}
                  >
          <img class="ref-icon" src="${doc.img}"></img>
          <span class="major">${doc.name}</span>
      </div>`;
  }
}

// A helper hook to handle clicks on refs. Opens/focuses the clicked item's window
export async function click_evt_open_ref(event: any) {
  event.preventDefault();
  event.stopPropagation();
  const elt = event.currentTarget;
  const doc = await resolve_ref_element(elt);
  if (doc) {
    doc.sheet?.render(true, { focus: true });
  }
}

// Given a ref element (as created by simple_mm_ref or similar function), find the item it is currently referencing
export async function resolve_ref_element(
  elt: HTMLElement
): Promise<LancerItem | LancerActor | LancerActiveEffect | null> {
  if (!elt.dataset.uuid) {
    return null;
  } else {
    let found = await fromUuid(elt.dataset.uuid);
    if (found && (found instanceof LancerItem || found instanceof LancerActor || found instanceof LancerActiveEffect)) {
      return found;
    } else if (found) {
      console.warn(`Ref element pointed at a ${found.documentName} - unsupported`);
    }
    return null;
  }
}

//
/**
 * Creates an img that is also a draggable ref. Expects guaranteed data! Use this to display the primary image in item/actor sheets,
 * so that they can be used as a sort of "self" ref
 *
 * @param img_path The path to read/edit said image
 * @param item The reffable item/actor itself
 */
export function ref_portrait<T extends EntryType>(
  img: string,
  img_path: string,
  item: LancerDoc<T>,
  _options: HelperOptions
) {
  // Fetch the image
  return `<img class="profile-img ref set" src="${img}" data-edit="${img_path}" ${ref_params(
    item
  )} width="100" height="100" />`;
}

// Use this slot callback to add items of certain kind(s) to a list.

// A helper suitable for showing a small preview of a ref (slot)
// In general, any preview here is less for "use" (e.x. don't tend to have elaborate macros) and more just to show something is there
// trash_actions controls what happens when the trashcan is clicked. Delete destroys an item, splice removes it from the array it is found in, and null replaces with null
export function item_preview<T extends LancerItemType>(
  item_path: string,
  trash_action: "delete" | "splice" | "null" | null,
  options: HelperOptions
): string {
  // Fetch
  let doc = resolve_helper_dotpath<LancerDoc<T>>(options, item_path);
  if (!doc) {
    // This probably shouldn't be happening
    console.error(`Unable to resolve ${item_path} in `, options.data);
    return "<span>err</span>";
  }
  // Make a re-used trashcan imprint
  let trash_can = "";
  if (trash_action) {
    trash_can = `<a class="gen-control i--white" data-action="${trash_action}" data-path="${item_path}"><i class="fas fa-trash"></i></a>`;
  }

  // Handle based on type
  if (doc.is_mech_system()) {
    return mechSystemView(item_path, options);
  } else if (doc.is_mech_weapon()) {
    return mechWeaponView(item_path, null, options);
  } else if (doc.is_talent()) {
    return talentView(item_path, options);
  } else if (doc.is_skill()) {
    return skillView(item_path, options);
  } else if (doc.is_core_bonus()) {
    return coreBonusView(item_path, options);
  } else if (doc.is_license()) {
    return license_ref(item_path, options);
  } else if (doc.is_npc_feature()) {
    return npc_feature_preview(item_path, options);
  } else if (doc.is_frame()) {
    return framePreview(item_path, options);
  } else {
    // Basically the same as the simple ref card, but with control added
    return `
      <div class="ref set ref-card click-open" 
              ${ref_params(doc)}>
        <img class="ref-icon" src="${doc.img}"></img>
        <span class="major">${doc.name}</span>
        <hr class="vsep"> 
        <div class="ref-controls">
          <a class="lancer-context-menu" data-context-menu="${doc.type}" data-path="${item_path}">
            <i class="fas fa-ellipsis-v"></i>
          </a>
        </div>
      </div>`;
  }
}

export function hex_array(curr: number, max: number, path: string) {
  return [...Array(max)].map((_ele, index) => {
    const available = index + 1 <= curr;
    return `<a><i class="uses-hex mdi ${
      available ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"
    } theme--light" data-available="${available}" data-path="${path}"></i></a>`;
  });
}

export function limited_uses_indicator(
  item:
    | LancerMECH_WEAPON
    | LancerMECH_SYSTEM
    | LancerWEAPON_MOD
    | LancerPILOT_WEAPON
    | LancerPILOT_GEAR
    | LancerNPC_FEATURE,
  path: string
): string {
  const uses = item.system.uses;

  const hexes = hex_array(uses.value, uses.max, path);

  return `<div class="clipped card limited-card">USES ${hexes.join("")}</div>`;
}

export function reserve_used_indicator(path: string, options: HelperOptions): string {
  let item = resolve_helper_dotpath(options, path) as LancerRESERVE;
  const hexes = hex_array(item.system.used ? 0 : 1, 1, path);

  return `<div class="clipped card limited-card">USED ${hexes.join("")}</div>`;
}

// Put this at the end of ref lists to have a place to drop things. Supports both native and non-native drops
// Allowed types is a list of space-separated allowed types. "mech pilot mech_weapon", for instance
export function item_preview_list(item_array_path: string, allowed_types: string, options: HelperOptions) {
  let embeds = resolve_helper_dotpath<Array<any>>(options, item_array_path, []);
  let trash = options.hash["trash"] ?? null;
  let previews = embeds.map((_, i) => item_preview(`${item_array_path}.${i}`, trash, options));
  return `
    <div class="flexcol ref-list" 
         data-path="${item_array_path}" 
         data-accept-types="${allowed_types}">
         ${previews.join("")}
    </div>`;
}

// Enables dropping of items into open slots at the end of lists generated by mm_ref_list_append_slot
// This doesn't handle natives. Requires two callbacks: One to get the item that will actually have its list appended,
// and one to commit any changes to aforementioned object
export function HANDLER_add_doc_to_list_on_drop<T>(html: JQuery, root_doc: LancerActor | LancerItem) {
  // Use our handy dandy helper
  HANDLER_enable_doc_dropping(html.find(".ref.ref-list"), async (rdd, evt) => {
    if (!(rdd.type == "Actor" || rdd.type == "Item")) return; // For now, don't allow adding macros etc to lists

    // Gather context information
    let path = evt[0].dataset.path;
    let allowed_items_raw = evt[0].dataset.acceptTypes ?? "";

    // Check type is allowed type
    if (allowed_items_raw && !allowed_items_raw.includes(rdd.document.type)) return;

    // Coerce val to appropriate type
    let val = rdd.document;

    // Try to apply the list addition
    if (path) {
      let dd = drilldownDocument(root_doc, path);
      let array = dd.terminus;
      if (Array.isArray(array)) {
        let changes = array_path_edit_changes(dd.sub_doc, dd.sub_path + ".-1", val, "insert");
        dd.sub_doc.update({ [changes.path]: changes.new_val });
      }
    }
  });
}

export function HANDLER_activate_uses_editor<T>(html: JQuery, doc: LancerActor | LancerItem) {
  let elements = html.find(".uses-hex");
  elements.on("click", async ev => {
    ev.stopPropagation();

    const params = ev.currentTarget.dataset;
    if (params.path) {
      const dd = drilldownDocument(doc, params.path);
      const item = dd.sub_doc as LancerMECH_SYSTEM | LancerMECH_WEAPON | LancerPILOT_GEAR | LancerNPC_FEATURE;
      const available = params.available === "true";

      let newUses = item.system.uses.value;
      if (item.is_reserve()) {
        item.update({ "system.used": true });
      } else {
        if (available) {
          // Deduct uses.
          newUses = Math.max(newUses - 1, item.system.uses.min);
        } else {
          // Increment uses.
          newUses = Math.min(newUses + 1, item.system.uses.max);
        }
        item.update({ "system.uses": newUses });
      }
    }
  });
}

// Enables dragging of ref cards (or anything with .ref.set and the appropriate fields)
// This doesn't handle natives
export function HANDLER_activate_ref_dragging(html: JQuery) {
  // Allow refs to be dragged arbitrarily
  HANDLER_enable_dragging(
    html.find(".ref.set"),
    (source, evt) => {
      let uuid = evt.currentTarget.dataset.uuid as string;
      if (!uuid || !(uuid.includes("Item.") || uuid.includes("Actor.") || uuid.includes("Token."))) {
        console.error("Unable to properly drag ref", source, evt.currentTarget);
        throw new Error("Drag error");
      }
      let result: FoundryDropData = {
        type: uuid.includes("Item.") ? "Item" : "Actor",
        uuid,
      };
      return JSON.stringify(result);
    },

    (start_stop, src, _evt) => {
      /*
    // Highlight valid drop points
    let drop_set_target_selector = `.ref.drop-settable.${src[0].dataset.type}`;
    let drop_append_target_selector = `.ref.ref-list.${src[0].dataset.type}`;
    let target_selector = `${drop_set_target_selector}, ${drop_append_target_selector}`;

    if (start_stop == "start") {
      $(target_selector).addClass("highlight-can-drop");
    } else {
      $(target_selector).removeClass("highlight-can-drop");
    }
    */
    }
  );
}

// Allow every ".ref.drop-settable" spot to be dropped onto, with a payload of a JSON RegRef
// Additionally provides the "pre_finalize_drop" function to (primarily) facillitate taking posession of items,
// but in general apply whatever transformations deemed necessary
export function HANDLER_activate_ref_slot_dropping(
  html: JQuery,
  root_doc: LancerActor | LancerItem,
  pre_finalize_drop: ((drop: ResolvedDropData) => Promise<ResolvedDropData>) | null
) {
  HANDLER_enable_doc_dropping(html.find(".ref.drop-settable"), async (drop, dest, evt) => {
    // Pre-finalize the entry
    if (pre_finalize_drop) {
      drop = await pre_finalize_drop(drop);
    }

    // Decide the mode
    let path = dest[0].dataset.path;
    let types = dest[0].dataset.acceptTypes as string;
    let val = drop.document;

    // Check allows
    if (types && !types.includes((drop.document as any).type ?? "err")) {
      return;
    }

    // Then set it to path, with an added correction of unsetting any other place its set on the same document's loadout (if path in loadout)
    if (path) {
      let dd = drilldownDocument(
        root_doc,
        path.endsWith(".value") ? path.slice(0, path.length - ".value".length) : path
      ); // If dropping onto an item.value, then truncate to target the item
      let updateData = {} as any;
      if (path.includes("loadout") && dd.sub_doc instanceof LancerActor) {
        // Do clear-correction here
        if (dd.sub_doc.is_pilot()) {
          // If other occurrences of val
          let cl = (dd.sub_doc as any).system._source.loadout as SourceData.Pilot["loadout"];
          if (cl.armor.some(x => x == val.id))
            updateData["system.loadout.armor"] = cl.armor.map(x => (x == val.id ? null : x));
          if (cl.gear.some(x => x == val.id))
            updateData["system.loadout.gear"] = cl.gear.map(x => (x == val.id ? null : x));
          if (cl.weapons.some(x => x == val.id))
            updateData["system.loadout.weapons"] = cl.weapons.map(x => (x == val.id ? null : x));
        } else if (dd.sub_doc.is_mech()) {
          let cl = (dd.sub_doc as any).system._source.loadout as SourceData.Mech["loadout"];
          if (cl.systems.some(x => x == val.id))
            updateData["system.loadout.systems"] = cl.systems.map(x => (x == val.id ? null : x));
          if (cl.weapon_mounts.some(x => x.slots.some(y => y.weapon == val.id || y.mod == val.id))) {
            updateData["system.loadout.weapon_mounts"] = cl.weapon_mounts.map(wm => ({
              slots: wm.slots.map(s => ({
                weapon: s.weapon == val.id ? null : s.weapon,
                mod: s.mod == val.id ? null : s.mod,
                size: s.size,
              })),
              bracing: wm.bracing,
              type: wm.type,
            }));
          }
        }
      }
      updateData[dd.sub_path] = val.id;
      dd.sub_doc.update(updateData);
    }
  });
}
