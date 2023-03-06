// Import TypeScript modules
import { LANCER } from "../config.js";
import { StabOptions1, StabOptions2 } from "../enums.js";
import { prepareTextMacro } from "./text.js";
import { LancerActor } from "../actor/lancer-actor.js";

const lp = LANCER.log_prefix;

export async function prepareStabilizeMacro(actor_: string | LancerActor) {
  // Determine which Actor to speak as
  let actor = LancerActor.fromUuidSync(actor_); // Re-define to avoid TS weird

  let template = await renderTemplate(`systems/${game.system.id}/templates/window/promptStabilize.hbs`, {});

  return new Promise<boolean>((resolve, reject) => {
    new Dialog({
      title: `STABILIZE - ${actor.name!}`,
      content: template,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Submit",
          callback: async dlg => {
            // Gotta typeguard the actor again
            if (!actor) return reject();

            let o1 = <StabOptions1>$(dlg).find(".stabilize-options-1:checked").first().val();
            let o2 = <StabOptions2>$(dlg).find(".stabilize-options-2:checked").first().val();

            let text = await actor.strussHelper.stabilize(o1, o2);

            if (!text) return;

            prepareTextMacro(
              actor,
              `${actor.name?.capitalize()} HAS STABILIZED`,
              `${actor.name} has stabilized.<br>${text}`
            );
            return resolve(true);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: async () => resolve(false),
        },
      },
      default: "submit",
      close: () => resolve(false),
    }).render(true);
  });
}
