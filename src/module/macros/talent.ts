// Import TypeScript modules
import { LANCER } from "../config.js";
import { renderMacroTemplate } from "./_render.js";
import { LancerItem } from "../item/lancer-item.js";

const lp = LANCER.log_prefix;

/**
 * Generic macro preparer for a talent
 * @param itemUUID The item id that is being rolled
 * @param rank The rank of the talent to roll
 */
export async function prepareTalentMacro(
  itemUUID: string | LancerItem,
  options?: {
    rank?: number;
  }
) {
  // Determine which Actor to speak as
  const item = LancerItem.fromUuidSync(itemUUID);
  if (!item || !item.actor || !item.is_talent()) return;

  // Construct the template
  const templateData = {
    title: item.name,
    rank: item.system.ranks[options?.rank ?? item.system.curr_rank],
    lvl: item.system.curr_rank,
  };
  const template = `systems/${game.system.id}/templates/chat/talent-card.hbs`;
  return renderMacroTemplate(item.actor!, template, templateData);
}
