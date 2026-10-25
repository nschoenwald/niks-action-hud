/**
 * Short "what is this roll used for" texts for ability checks and saving throws, read from the
 * D&D 5e rules journals the system ships (the same wording its own rule tooltips use).
 */

const RULES_PAGE = "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage";

/** Standalone "<Ability> Saving Throw" rule pages; Strength's lives inside its ability page. */
const SAVE_PAGE_IDS = Object.freeze({
	dex: "LctvYhAwwujfBccv",
	con: "Qf9tGqO5R7yYSz8u",
	int: "6dXTwUjnG05rZC1o",
	wis: "LCcejwk69VOyK5Eb",
	cha: "MYQ51erE4wBEAOvy",
});

const cache = new Map();

/** Plain text of a journal page's HTML, with enrichers reduced to their label. */
function toPlainText(html) {
	const cleaned = String(html ?? "").replace(/@\w+\[[^\]]*\](?:\{([^}]*)\})?/g, "$1");
	const doc = new DOMParser().parseFromString(cleaned, "text/html");
	return doc.body.textContent.replace(/\s+/g, " ").trim();
}

/** Intro paragraph and the text under each heading of an ability rule page. */
function splitAbilityPage(html) {
	const doc = new DOMParser().parseFromString(String(html ?? ""), "text/html");
	const sections = [];
	let intro = "";
	let current = null;
	for (const node of doc.body.children) {
		if (node.tagName === "H3") {
			current = [];
			sections.push(current);
		} else if (current) current.push(node.outerHTML);
		else if (!intro && node.tagName === "P") intro = node.outerHTML;
	}
	return { intro: toPlainText(intro), sections: sections.map((parts) => parts.join("")) };
}

/** Resolve one section's HTML, following a single @Embed to the page it points at. */
async function sectionText(html) {
	const embed = /@Embed\[([^\s\]]+)/.exec(html ?? "");
	if (!embed) return toPlainText(html);
	const page = await fromUuid(embed[1]).catch(() => null);
	return toPlainText(page?.text?.content ?? "");
}

async function loadRuleText(abilityKey) {
	const result = { intro: "", check: "", save: "" };
	const reference = CONFIG.DND5E?.abilities?.[abilityKey]?.reference;
	const page = reference ? await fromUuid(reference).catch(() => null) : null;
	if (page?.text?.content) {
		const { intro, sections } = splitAbilityPage(page.text.content);
		result.intro = intro;
		result.check = await sectionText(sections[0]);
		// Strength is the one ability whose saving throw is a second section of its own page.
		if (abilityKey === "str") result.save = await sectionText(sections[1]);
	}
	if (SAVE_PAGE_IDS[abilityKey]) {
		const savePage = await fromUuid(`${RULES_PAGE}.${SAVE_PAGE_IDS[abilityKey]}`).catch(() => null);
		result.save = toPlainText(savePage?.text?.content ?? "");
	}
	return result;
}

const skillCache = new Map();

/**
 * Example uses of a skill ("Examples: Stay on your feet in a tricky situation, ...") from its rule page.
 * @param {string} skillKey - "acr" | "ath" | ...
 * @returns {Promise<string>} Empty when the system's text is unavailable.
 */
export function getSkillRuleText(skillKey) {
	const key = String(skillKey ?? "");
	if (!skillCache.has(key)) {
		const reference = CONFIG.DND5E?.skills?.[key]?.reference;
		const load = reference ? fromUuid(reference).then((page) => toPlainText(page?.text?.content ?? "")) : Promise.resolve("");
		skillCache.set(key, load.catch(() => ""));
	}
	return skillCache.get(key);
}

/**
 * @param {string} abilityKey - "str" | "dex" | ...
 * @returns {Promise<{ intro: string, check: string, save: string }>} Empty strings when the system's text is unavailable.
 */
export function getAbilityRuleText(abilityKey) {
	const key = String(abilityKey ?? "").toLowerCase();
	if (!cache.has(key)) cache.set(key, loadRuleText(key).catch(() => ({ intro: "", check: "", save: "" })));
	return cache.get(key);
}
