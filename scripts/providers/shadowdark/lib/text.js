import { text } from "../../../core/text.js";

/** Shadowdark provider text: NAH.Shadowdark.Text.<key> with an English fallback. */
export const sd = (key, fallback, data) => text(`NAH.Shadowdark.Text.${key}`, fallback, data);
