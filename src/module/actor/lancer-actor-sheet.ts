import { LANCER } from "../config.js";
import { HANDLER_activate_general_controls, HANDLER_activate_popout_text_editor } from "../helpers/commons.js";
import { HANDLER_enable_doc_dropping } from "../helpers/dragdrop.js";
import type { ResolvedDropData } from "../helpers/dragdrop.js";
import { HANDLER_activate_counter_listeners, HANDLER_activate_plus_minus_buttons } from "../helpers/item.js";
import {
  HANDLER_activate_ref_dragging,
  HANDLER_activate_ref_slot_dropping,
  click_evt_open_ref,
  HANDLER_activate_uses_editor,
} from "../helpers/refs.js";
import type { GenControlContext, LancerActorSheetData } from "../interfaces.js";
import { LancerItem } from "../item/lancer-item.js";
import { LancerActor } from "./lancer-actor.js";
import type { LancerActorType } from "./lancer-actor.js";
import { prepareActivationMacro, prepareChargeMacro, prepareItemMacro, runEncodedMacro } from "../macros.js";
import { ActivationOptions } from "../enums.js";
import { applyCollapseListeners, CollapseHandler, initializeCollapses } from "../helpers/collapse.js";
import { addExportButton } from "../helpers/io.js";
import type { ActionType } from "../action/index.js";
import { InventoryDialog } from "../apps/sheets/inventory.js";
import { HANDLER_activate_item_context_menus, HANDLER_activate_edit_counter } from "../helpers/item.js";
import { getActionTrackerOptions } from "../settings.js";
import { modAction } from "../action/action-tracker.js";
import { insinuate } from "../util/doc.js";
import type { PrototypeTokenData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/prototypeTokenData.js";
import { LancerActiveEffect } from "../effects/lancer-active-effect.js";
import type { LancerMacro } from "../macros/interfaces.js";
import { lookupOwnedDeployables } from "../util/lid.js";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerActorSheet<T extends LancerActorType> extends ActorSheet<
  ActorSheet.Options,
  LancerActorSheetData<T>
> {
  // Tracks collapse state between renders
  protected collapse_handler = new CollapseHandler();

  static get defaultOptions(): ActorSheet.Options {
    return mergeObject(super.defaultOptions, {
      scrollY: [".scroll-body"],
    });
  }

  /* -------------------------------------------- */
  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Enable collapse triggers.
    initializeCollapses(html);
    applyCollapseListeners(html);

    // Enable any action grid buttons.
    this._activateActionGridListeners(html);

    // Make generic refs clickable to open the item
    $(html).find(".ref.set.click-open").on("click", click_evt_open_ref);

    // Enable ref dragging
    HANDLER_activate_ref_dragging(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // All-actor macros
    this._activateMacroListeners(html);

    // All-actor macro dragging
    this._activateMacroDragging(html);

    let getfunc = () => this.getData();

    // Make +/- buttons work
    HANDLER_activate_plus_minus_buttons(html, this.actor);

    // Make counter pips work
    HANDLER_activate_counter_listeners(html, this.actor);

    // Enable hex use triggers.
    HANDLER_activate_uses_editor(html, this.actor);

    // Enable context menu triggers.
    HANDLER_activate_item_context_menus(html, this.actor);

    // Enable viewing inventory on sheets that support it
    this._activateInventoryButton(html);

    // Make refs droppable, in such a way that we take ownership when dropped
    HANDLER_activate_ref_slot_dropping(html, this.actor, x => this.quickOwnDrop(x).then(v => v[0]));

    // Enable general controls, so items can be deleted and such
    HANDLER_activate_general_controls(html, this.actor, this._generalControlsPostHook);

    // Enable popout editors
    HANDLER_activate_popout_text_editor(html, this.actor);

    HANDLER_activate_edit_counter(html, getfunc);

    // Add export button.
    addExportButton(this.object, html);

    // Add root dropping
    HANDLER_enable_doc_dropping(
      html,
      async (entry, _dest, _event) => this.onRootDrop(entry, _event, _dest),
      (entry, _dest, _event) => this.canRootDrop(entry)
    );
  }

  // To be implemented by base classes as needed
  _generalControlsPostHook(_ctx: GenControlContext) {}

  _activateMacroDragging(html: JQuery) {
    const ActionMacroHandler = (e: DragEvent) => this._onDragActivationChipStart(e);
    const EncodedMacroHandler = (e: DragEvent) => this._onDragEncodedMacroStart(e);

    html
      .find('li[class*="item"]')
      .add('span[class*="item"]')
      .add('[class*="lancer-macro"]')
      .each((_i, item) => {
        if (item.classList.contains("inventory-header")) return;
        item.setAttribute("draggable", "true");
        if (item.classList.contains("lancer-macro")) {
          item.addEventListener("dragstart", EncodedMacroHandler, false);
          return;
        }
        if (item.classList.contains("activation-chip")) item.addEventListener("dragstart", ActionMacroHandler, false);
        if (item.classList.contains("item"))
          item.addEventListener(
            "dragstart",
            (ev: any) => {
              this._onDragStart(ev);
            },
            false
          );
      });
  }

  _onDragEncodedMacroStart(e: DragEvent) {
    // For macros with encoded data
    e.stopPropagation();

    let encoded = (<HTMLElement>e.currentTarget).getAttribute("data-macro");

    if (!encoded) throw Error("No macro data available");

    let data = JSON.parse(decodeURI(window.atob(encoded)));
    e.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  async _activateActionGridListeners(html: JQuery) {
    let elements = html.find(".lancer-action-button");
    elements.on("click", async ev => {
      ev.stopPropagation();

      if (game.user?.isGM || getActionTrackerOptions().allowPlayers) {
        const params = ev.currentTarget.dataset;
        const action = params.action as ActionType | undefined;
        const data = await this.getData();
        if (action && params.val) {
          let spend: boolean;
          if (params.action === "move") {
            spend = parseInt(params.val) > 0;
          } else {
            spend = params.val === "true";
          }
          modAction(data.actor, spend, action);
        }
      } else {
        console.log(`${game.user?.name} :: Users currently not allowed to toggle actions through action manager.`);
      }
    });
  }

  _activateMacroListeners(html: JQuery) {
    // Encoded macros
    let encMacros = html.find(".lancer-macro");
    encMacros.on("click", ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers
      runEncodedMacro(ev.currentTarget);
    });

    // Weapon rollers
    let weaponMacro = html.find(".roll-attack");
    weaponMacro.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();

      const weaponElement = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const weaponId = weaponElement.dataset.uuid;
      const weapon = LancerItem.fromUuidSync(weaponId ?? "", "Error rolling macro");
      prepareItemMacro(weapon.uuid!);
    });

    // TODO: For sanity's sake, merge these into a single "macro" handler
    // Trigger rollers
    let itemMacros = html
      .find(".skill-macro")
      // System rollers
      .add(html.find(".system-macro"))
      // Gear rollers
      .add(html.find(".gear-macro"))
      // Core bonus
      .add(html.find(".cb-macro"))
      // Reserve
      .add(html.find(".reserve-macro"));
    itemMacros.on("click", (ev: any) => {
      ev.stopPropagation(); // Avoids triggering parent event handlers

      const el = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      prepareItemMacro(el.dataset.uuid!);
    });

    // Action-chip (system? Or broader?) macros
    html.find(".activation-macro").on("click", ev => {
      ev.stopPropagation();

      const el = ev.currentTarget;

      const item = el.dataset.uuid;
      const path = el.dataset.path;
      if (!item || !path) throw Error("No item ID from activation chip");

      let is_action = path.includes("action");
      let is_deployable = path.includes("deployable");

      if (is_action) {
        prepareActivationMacro(item, ActivationOptions.ACTION, path);
      } else if (is_deployable) {
        prepareActivationMacro(item, ActivationOptions.DEPLOYABLE, path);
      } else {
        ui.notifications?.error("Could not infer action type");
      }
    });

    let ChargeMacro = html.find(".charge-macro");
    ChargeMacro.on("click", ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers

      prepareChargeMacro(this.actor);
    });
  }

  _onDragActivationChipStart(event: DragEvent) {
    // For talent macros
    event.stopPropagation(); // Avoids triggering parent event handlers

    let target = <HTMLElement>event.currentTarget;

    let title = target.closest(".action-wrapper")?.querySelector(".action-title")?.textContent;
    let itemId = target.closest("[data-uuid]")?.getAttribute("data-uuid");

    if (!itemId) throw Error("No item found");

    title = title ?? this.actor.items.get(itemId)?.name ?? "unknown activation";

    let a = target.getAttribute("data-activation");
    let d = target.getAttribute("data-deployable");

    let activationOption: ActivationOptions;
    let activationIndex: number;
    if (a) {
      const activation = parseInt(a);
      activationOption = ActivationOptions.ACTION;
      activationIndex = activation;
    } else if (d) {
      const deployable = parseInt(d);
      activationOption = ActivationOptions.DEPLOYABLE;
      activationIndex = deployable;
    } else {
      throw Error("unknown activation was dragged.");
    }

    // send as a generated macro:
    let macroData: LancerMacro.Invocation = {
      iconPath: `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`,
      title: title!,
      fn: "prepareActivationMacro",
      args: [itemId, activationOption, activationIndex],
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(macroData));
  }

  getStatPath(event: any): string | null {
    if (!event.currentTarget) return null;
    // Find the stat input to get the stat's key to pass to the macro function
    let el = $(event.currentTarget).closest(".stat-container").find(".lancer-stat")[0] as HTMLElement;

    if (!el) el = $(event.currentTarget).siblings(".lancer-stat")[0];

    if (el.nodeName === "INPUT") {
      return (<HTMLInputElement>el).name;
    } else if (el.nodeName === "DATA") {
      return (<HTMLDataElement>el).id;
    } else if (el.nodeName === "SPAN") {
      return (<HTMLSpanElement>el).getAttribute("data-path");
    } else {
      throw "Error - stat macro was not run on an input or data element";
    }
  }

  /**
   * Handles inventory button
   */
  _activateInventoryButton(html: any) {
    let button = html.find(".inventory button");

    button.on("click", async (ev: Event) => {
      ev.preventDefault();
      return InventoryDialog.show_inventory(this.actor as LancerActor);
    });
  }

  // A grand filter that pre-decides if we can drop an item ref anywhere within this sheet. Should be implemented by child sheets
  // We generally assume that a global item is droppable if it matches our types, and that an owned item is droppable if it is owned by this actor
  // This is more of a permissions/suitability question
  canRootDrop(_item: ResolvedDropData): boolean {
    return false;
  }

  // This function is called on any dragged item that percolates down to root without being handled
  // Override/extend as appropriate
  async onRootDrop(_item: ResolvedDropData, _event: JQuery.DropEvent, _dest: JQuery<HTMLElement>): Promise<void> {}

  // Override base behavior
  protected _createDragDropHandlers(): DragDrop[] {
    return [];
  }

  // Makes us own (or rather, creates an owned copy of) the provided item if we don't already.
  // The second return value indicates whether a new copy was made (true), or if we already owned it/it is an actor (false)
  // Note: this operation also fixes limited to be the full capability of our actor
  async quickOwn(document: LancerItem): Promise<[LancerItem, boolean]> {
    if (document.parent != this.actor) {
      let results = await insinuate([document], this.actor);
      for (let newItem of results) {
        if (newItem.isLimited()) {
          await newItem.update({
            "system.uses.value": newItem.system.uses.max,
          });
        }
      }
      return [results[0], true];
    } else {
      // Its already owned
      return [document, false];
    }
  }

  // As quick_own, but for any drop. Maintains drop structure, since not necessarily guaranteed to have made an item
  async quickOwnDrop(drop: ResolvedDropData): Promise<[ResolvedDropData, boolean]> {
    if (drop.type == "Item") {
      let [document, new_] = await this.quickOwn(drop.document);
      return [
        {
          type: "Item",
          document,
        },
        new_,
      ];
    } else {
      return [drop, false];
    }
  }

  _propagateData(formData: any): any {
    // Pushes relevant field data from the form to other appropriate locations,
    // e.x. to synchronize name between token and actor
    // @ts-expect-error should be fixed and not need the "as" with v10 types
    let token = this.actor.prototypeToken as PrototypeTokenData;

    if (!token) {
      // Set the prototype token image if the prototype token isn't initialized
      formData["prototypeToken.texture.src"] = formData["img"];
      formData["prototypeToken.name"] = formData["name"];
    } else {
      // Update token image if it matches the old actor image - keep in sync
      // @ts-expect-error
      if (this.actor.img === token.texture.src && this.actor.img !== formData["img"]) {
        formData["prototypeToken.texture.src"] = formData["img"];
      }
      // Ditto for name
      if (this.actor.name === token["name"] && this.actor.name !== formData["name"]) {
        formData["prototypeToken.name"] = formData["name"];
      }
    }
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(_event: Event, formData: any): Promise<LancerActor | undefined> {
    // Automatically propagates changes to image/name
    this._propagateData(formData);

    // Simple writeback
    await this.actor.update(formData);

    return this.actor;
  }

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  async getData(): Promise<LancerActorSheetData<T>> {
    const data = await super.getData(); // Not fully populated yet!
    data.collapse = {};
    // @ts-expect-error
    data.system = this.actor.system; // Alias
    data.itemTypes = this.actor.itemTypes;
    data.effect_categories = LancerActiveEffect.prepareActiveEffectCategories(this.actor);
    data.deployables = lookupOwnedDeployables(this.actor);
    console.log(`${lp} Rendering with following actor ctx: `, data);
    return data;
  }
}
