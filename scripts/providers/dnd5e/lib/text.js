import { text } from "../../../core/text.js";

/** dnd5e provider text: NAH.Dnd5e.Text.<key> with an English fallback. */
export const dd = (key, fallback, data) => text(`NAH.Dnd5e.Text.${key}`, fallback, data);
