/**
 * Declarative section tables for system providers.
 *
 * A section is a plain data entry describing one drawer a system can offer:
 *   { id, aliases, builder, ribbon: { labelKey, fallback, icon, nav } }   nav: default pane navigation, "top" | "side"
 * `builder` names an entry in the provider's builder table; the generic resolver below
 * replaces the per-system dispatch code, and the ribbon defaults are derived from the same table.
 */

import { emptyDrawer } from "./shared/drawer-model.js";

const localizeOr = (key, fallback) => game.i18n?.localize?.(key) || fallback;

/**
 * @param {Array<object>} specs  Plain section declarations.
 * @param {Record<string, (actor: Actor, menuData: object) => object>} builders  Named builders.
 * @param {object} [options]
 * @param {(result: object, ctx: {sectionId: string, menuData: object}) => object} [options.decorate]
 * @param {(ctx: {sectionId: string, menuData: object}) => object} [options.fallback]
 * @param {boolean} [options.requireActor]
 */
export function createSectionRegistry(specs, builders, { decorate, fallback, requireActor = false } = {}) {
	const byKey = new Map();
	for (const spec of specs) {
		for (const key of [spec.id, ...(spec.aliases ?? [])]) byKey.set(key, spec);
	}
	const nothing = ({ menuData }) => emptyDrawer(menuData?.label ?? "");

	return {
		specs,

		/** Default ribbon categories for this system. */
		starterLayout() {
			return specs.filter((spec) => spec.ribbon).map((spec) => ({
				sectionId: spec.id,
				label: localizeOr(spec.ribbon.labelKey, spec.ribbon.fallback),
				icon: spec.ribbon.icon,
				nav: spec.ribbon.nav === "side" ? "side" : "top",
			}));
		},

		/** Build the drawer payload for a system category id (or alias). */
		resolve(actor, sectionId, menuData = {}) {
			const ctx = { sectionId, menuData };
			if (requireActor && !actor) return nothing(ctx);
			const spec = byKey.get(sectionId);
			const build = spec && builders[spec.builder];
			if (!build) return (fallback ?? nothing)(ctx);
			const result = build(actor, menuData);
			return decorate ? decorate(result, ctx) : result;
		},
	};
}
