import { resolveIconSource } from "../../../core/icon-source.js";
import { collatorFor } from "../../../core/text.js";

const TABS = Object.freeze([
	{ value: "fontAwesome", labelKey: "Tab.FontAwesome" },
	{ value: "rpgAwesome", labelKey: "Tab.RpgAwesome" },
	{ value: "emoji", labelKey: "Tab.Emoji" },
	{ value: "image", labelKey: "Tab.Image" },
]);

const FAMILIES = Object.freeze([
	{ value: "fa-solid", labelKey: "Family.Solid" },
	{ value: "fa-regular", labelKey: "Family.Regular" },
	{ value: "fa-brands", labelKey: "Family.Brands" },
]);

const FAMILY_VALUES = FAMILIES.map((family) => family.value);

const SINGLE_FAMILY_LABEL_KEY = Object.freeze({ rpgAwesome: "Family.Solid", emoji: "Family.Color", image: "Family.File" });

const LIMIT = 300;

const FALLBACK_FA_NAMES = Object.freeze([
	"star", "heart", "fire", "bolt", "coins", "sack-dollar", "money-bill", "gem", "crown", "shield", "shield-halved",
	"hammer", "flask", "scroll", "book", "map", "compass", "key", "lock", "lock-open", "bag-shopping", "cart-shopping",
	"store", "tag", "tags", "scale-balanced", "handshake", "user", "users", "skull", "ghost", "dragon", "hat-wizard",
	"wand-magic-sparkles", "dice-d20", "dice", "bell", "clock", "feather", "leaf", "tree", "mountain", "anchor",
	"gear", "wrench", "box", "eye", "magnifying-glass", "circle-info", "triangle-exclamation", "check", "xmark",
]);

const EMOJI = Object.freeze([
	{ glyph: "🪙", keywords: ["moeda", "coin", "gold", "ouro", "dinheiro", "money"] },
	{ glyph: "💰", keywords: ["saco", "money", "bag", "dinheiro", "tesouro", "treasure"] },
	{ glyph: "💎", keywords: ["gema", "gem", "diamante", "diamond", "joia", "jewel"] },
	{ glyph: "👑", keywords: ["coroa", "crown", "rei", "king", "nobre"] },
	{ glyph: "🏆", keywords: ["trofeu", "trophy", "premio", "prize"] },
	{ glyph: "🎖️", keywords: ["medalha", "medal", "honra", "honor"] },
	{ glyph: "⚔️", keywords: ["espadas", "swords", "combate", "combat", "guerra", "war"] },
	{ glyph: "🗡️", keywords: ["adaga", "dagger", "espada", "sword", "lamina", "blade"] },
	{ glyph: "🛡️", keywords: ["escudo", "shield", "defesa", "defense", "protecao"] },
	{ glyph: "🏹", keywords: ["arco", "bow", "flecha", "arrow", "arqueiro", "archer"] },
	{ glyph: "🪓", keywords: ["machado", "axe", "lenhador"] },
	{ glyph: "🔨", keywords: ["martelo", "hammer", "forja", "forge"] },
	{ glyph: "⚒️", keywords: ["ferramentas", "tools", "ferraria", "smith"] },
	{ glyph: "🔧", keywords: ["chave", "wrench", "conserto", "repair"] },
	{ glyph: "⚙️", keywords: ["engrenagem", "gear", "config", "maquina", "machine"] },
	{ glyph: "🧪", keywords: ["pocao", "potion", "alquimia", "alchemy", "frasco", "flask"] },
	{ glyph: "⚗️", keywords: ["alambique", "alembic", "alquimia", "alchemy"] },
	{ glyph: "🧴", keywords: ["frasco", "bottle", "oleo", "oil"] },
	{ glyph: "🍷", keywords: ["vinho", "wine", "taverna", "tavern", "bebida", "drink"] },
	{ glyph: "🍺", keywords: ["cerveja", "beer", "taverna", "tavern"] },
	{ glyph: "🍞", keywords: ["pao", "bread", "comida", "food"] },
	{ glyph: "🥩", keywords: ["carne", "meat", "comida", "food"] },
	{ glyph: "🧀", keywords: ["queijo", "cheese", "comida", "food"] },
	{ glyph: "🍎", keywords: ["maca", "apple", "fruta", "fruit"] },
	{ glyph: "🥕", keywords: ["cenoura", "carrot", "legume", "vegetable"] },
	{ glyph: "🌿", keywords: ["erva", "herb", "planta", "plant"] },
	{ glyph: "🍄", keywords: ["cogumelo", "mushroom", "fungo"] },
	{ glyph: "🌾", keywords: ["trigo", "wheat", "colheita", "harvest"] },
	{ glyph: "🌳", keywords: ["arvore", "tree", "floresta", "forest"] },
	{ glyph: "⛰️", keywords: ["montanha", "mountain", "pedra", "rock"] },
	{ glyph: "🌊", keywords: ["onda", "wave", "mar", "sea", "agua", "water"] },
	{ glyph: "🔥", keywords: ["fogo", "fire", "chama", "flame", "quente", "hot"] },
	{ glyph: "❄️", keywords: ["gelo", "ice", "frio", "cold", "neve", "snow"] },
	{ glyph: "⚡", keywords: ["raio", "lightning", "energia", "energy", "rapido", "fast"] },
	{ glyph: "✨", keywords: ["brilho", "sparkles", "magia", "magic", "novo", "new"] },
	{ glyph: "🌟", keywords: ["estrela", "star", "destaque", "featured"] },
	{ glyph: "⭐", keywords: ["estrela", "star", "favorito", "favorite"] },
	{ glyph: "🌙", keywords: ["lua", "moon", "noite", "night"] },
	{ glyph: "☀️", keywords: ["sol", "sun", "dia", "day"] },
	{ glyph: "🌑", keywords: ["lua nova", "new moon", "escuro", "dark"] },
	{ glyph: "🐺", keywords: ["lobo", "wolf", "werewolf", "lobisomem"] },
	{ glyph: "🦇", keywords: ["morcego", "bat", "vampiro", "vampire"] },
	{ glyph: "🐉", keywords: ["dragao", "dragon", "monstro", "monster"] },
	{ glyph: "🐍", keywords: ["cobra", "snake", "veneno", "poison"] },
	{ glyph: "🕷️", keywords: ["aranha", "spider", "teia", "web"] },
	{ glyph: "🐀", keywords: ["rato", "rat", "esgoto", "sewer"] },
	{ glyph: "🐴", keywords: ["cavalo", "horse", "montaria", "mount"] },
	{ glyph: "🦅", keywords: ["aguia", "eagle", "ave", "bird"] },
	{ glyph: "🐦", keywords: ["passaro", "bird", "corvo", "crow"] },
	{ glyph: "💀", keywords: ["caveira", "skull", "morte", "death"] },
	{ glyph: "☠️", keywords: ["veneno", "poison", "perigo", "danger", "morte", "death"] },
	{ glyph: "👻", keywords: ["fantasma", "ghost", "espirito", "spirit"] },
	{ glyph: "🧙", keywords: ["mago", "wizard", "magia", "magic"] },
	{ glyph: "🧝", keywords: ["elfo", "elf"] },
	{ glyph: "🧟", keywords: ["zumbi", "zombie", "morto vivo", "undead"] },
	{ glyph: "🥷", keywords: ["ninja", "furtivo", "stealth", "shinobi"] },
	{ glyph: "🧛", keywords: ["vampiro", "vampire"] },
	{ glyph: "👤", keywords: ["pessoa", "person", "usuario", "user", "silhueta"] },
	{ glyph: "👥", keywords: ["pessoas", "people", "grupo", "group", "usuarios", "users"] },
	{ glyph: "🤝", keywords: ["acordo", "deal", "troca", "trade", "aperto de mao", "handshake"] },
	{ glyph: "🏪", keywords: ["loja", "store", "shop", "mercado", "market"] },
	{ glyph: "🏰", keywords: ["castelo", "castle", "fortaleza", "fortress"] },
	{ glyph: "⛺", keywords: ["tenda", "tent", "acampamento", "camp"] },
	{ glyph: "🏚️", keywords: ["ruina", "ruin", "casa", "house", "abandonada"] },
	{ glyph: "🚪", keywords: ["porta", "door", "entrada", "entrance"] },
	{ glyph: "🗝️", keywords: ["chave", "key", "segredo", "secret"] },
	{ glyph: "🔒", keywords: ["cadeado", "lock", "fechado", "closed", "trancado"] },
	{ glyph: "🔓", keywords: ["aberto", "unlock", "open", "destrancado"] },
	{ glyph: "📜", keywords: ["pergaminho", "scroll", "contrato", "contract", "texto"] },
	{ glyph: "📖", keywords: ["livro", "book", "grimorio", "tome", "leitura"] },
	{ glyph: "📕", keywords: ["livro", "book", "manual"] },
	{ glyph: "🗺️", keywords: ["mapa", "map", "viagem", "travel"] },
	{ glyph: "🧭", keywords: ["bussola", "compass", "direcao", "direction"] },
	{ glyph: "🪶", keywords: ["pena", "feather", "escrita", "quill"] },
	{ glyph: "✒️", keywords: ["caneta", "pen", "assinatura", "signature"] },
	{ glyph: "📝", keywords: ["nota", "note", "anotacao", "write"] },
	{ glyph: "📦", keywords: ["caixa", "box", "pacote", "package", "estoque", "stock"] },
	{ glyph: "🎒", keywords: ["mochila", "backpack", "inventario", "inventory"] },
	{ glyph: "🛒", keywords: ["carrinho", "cart", "compra", "buy"] },
	{ glyph: "🧺", keywords: ["cesta", "basket", "compras"] },
	{ glyph: "🏷️", keywords: ["etiqueta", "tag", "preco", "price", "promocao"] },
	{ glyph: "🧾", keywords: ["recibo", "receipt", "nota fiscal", "invoice"] },
	{ glyph: "💳", keywords: ["cartao", "card", "credito", "credit", "pagamento", "payment"] },
	{ glyph: "⚖️", keywords: ["balanca", "scale", "justica", "justice", "peso", "weight"] },
	{ glyph: "⏳", keywords: ["ampulheta", "hourglass", "tempo", "time", "espera"] },
	{ glyph: "⌛", keywords: ["tempo", "time", "acabou", "expired"] },
	{ glyph: "🕰️", keywords: ["relogio", "clock", "hora", "hour"] },
	{ glyph: "🔔", keywords: ["sino", "bell", "aviso", "alert", "notificacao"] },
	{ glyph: "📣", keywords: ["megafone", "megaphone", "anuncio", "announce", "aviso"] },
	{ glyph: "🎺", keywords: ["trombeta", "trumpet", "anuncio", "fanfarra"] },
	{ glyph: "🎲", keywords: ["dado", "dice", "sorte", "luck", "aleatorio", "random"] },
	{ glyph: "🃏", keywords: ["carta", "card", "coringa", "joker"] },
	{ glyph: "🎭", keywords: ["mascara", "mask", "teatro", "theater", "disfarce"] },
	{ glyph: "🎯", keywords: ["alvo", "target", "mira", "aim", "objetivo"] },
	{ glyph: "🧿", keywords: ["amuleto", "amulet", "protecao", "charm"] },
	{ glyph: "🔮", keywords: ["bola de cristal", "crystal ball", "adivinhacao", "fortune"] },
	{ glyph: "🪄", keywords: ["varinha", "wand", "magia", "magic"] },
	{ glyph: "🕯️", keywords: ["vela", "candle", "luz", "light", "ritual"] },
	{ glyph: "🏮", keywords: ["lanterna", "lantern", "luz", "light"] },
	{ glyph: "💡", keywords: ["ideia", "idea", "luz", "light", "dica", "hint"] },
	{ glyph: "❤️", keywords: ["coracao", "heart", "vida", "life", "amor", "love"] },
	{ glyph: "💔", keywords: ["coracao partido", "broken heart", "dano", "damage"] },
	{ glyph: "🩸", keywords: ["sangue", "blood", "ferimento", "wound"] },
	{ glyph: "☣️", keywords: ["biologico", "biohazard", "veneno", "toxic"] },
	{ glyph: "☢️", keywords: ["radiacao", "radiation", "perigo", "danger"] },
	{ glyph: "⚠️", keywords: ["aviso", "warning", "atencao", "caution"] },
	{ glyph: "✅", keywords: ["certo", "check", "ok", "aprovado", "done"] },
	{ glyph: "❌", keywords: ["errado", "wrong", "cancelar", "cancel", "fechado"] },
	{ glyph: "➕", keywords: ["mais", "plus", "adicionar", "add"] },
	{ glyph: "➖", keywords: ["menos", "minus", "remover", "remove"] },
	{ glyph: "🔺", keywords: ["subiu", "up", "alta", "increase"] },
	{ glyph: "🔻", keywords: ["desceu", "down", "baixa", "decrease"] },
	{ glyph: "🆕", keywords: ["novo", "new", "novidade"] },
	{ glyph: "🔥", keywords: ["promocao", "sale", "quente", "hot"] },
]);

const normalize = (text) => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const queryTerms = (query) => normalize(query).split(/\s+/).filter(Boolean);

const matchesAll = (haystack, terms) => terms.every((term) => haystack.some((candidate) => candidate.includes(term)));

const rankOf = (haystack, terms) => {
	if (terms.length === 0) return 0;
	const query = terms.join(" ");
	if (haystack.some((candidate) => candidate === query)) return 0;
	return haystack.some((candidate) => candidate.startsWith(query)) ? 1 : 2;
};

const byRelevance = (options, terms) => {
	const ordered = terms.length === 0 ? [...options] : [...options].sort((a, b) => a.rank - b.rank || collatorFor().compare(a.label, b.label));
	return ordered.map(({ rank: _rank, ...option }) => option);
};

const classOptions = (names, prefix, terms, value) => {
	const out = [];
	for (const name of names) {
		const normalized = normalize(name);
		const haystack = [normalized, normalized.replace(/-/g, " ")];
		if (!matchesAll(haystack, terms)) continue;
		const optionValue = `${prefix}${name}`;
		out.push({ value: optionValue, label: name, className: optionValue, glyph: "", isGlyph: false, selected: optionValue === value, rank: rankOf(haystack, terms) });
	}
	return byRelevance(out, terms);
};

const emojiOptions = (terms, value) => {
	const out = [];
	for (const entry of EMOJI) {
		const haystack = entry.keywords.map(normalize);
		if (!matchesAll(haystack, terms)) continue;
		out.push({ value: entry.glyph, label: entry.keywords[0] ?? entry.glyph, className: "", glyph: entry.glyph, isGlyph: true, selected: entry.glyph === value, rank: rankOf(haystack, terms) });
	}
	return byRelevance(out, terms);
};

export const iconFamilyFromValue = (value, fallback = "fa-solid") => {
	const source = resolveIconSource(value);
	if (source.kind !== "icon") return fallback;
	return source.iconClass.split(/\s+/).find((part) => FAMILY_VALUES.includes(part)) ?? fallback;
};

export const iconTabFromValue = (value) => {
	const source = resolveIconSource(value);
	if (source.kind === "image") return "image";
	if (source.kind === "glyph") return "emoji";
	if (source.kind === "icon" && source.iconClass.split(/\s+/).includes("ra")) return "rpgAwesome";
	return "fontAwesome";
};

export const imagePickerTarget = (value) => (resolveIconSource(value).kind === "image" ? value.trim() : "");

export const buildIconPickerView = ({ faNames, raNames, query = "", tab = "fontAwesome", family = "fa-solid", value = "", t = (key) => key }) => {
	const trimmedValue = value.trim();
	const terms = queryTerms(query);
	const familyLabel = t(FAMILIES.find((candidate) => candidate.value === family)?.labelKey ?? "Family.Solid");

	let matches = [];
	if (tab === "fontAwesome") matches = classOptions(faNames.length > 0 ? faNames : FALLBACK_FA_NAMES, `${family} fa-`, terms, trimmedValue);
	else if (tab === "rpgAwesome") matches = classOptions(raNames, "ra ra-", terms, trimmedValue);
	else if (tab === "emoji") matches = emojiOptions(terms, trimmedValue);

	const preview = resolveIconSource(trimmedValue);
	const isImage = tab === "image";
	const isEmpty = !isImage && matches.length === 0;

	const count = String(matches.length);
	let countLabel = t("CountImage");
	if (tab === "fontAwesome") countLabel = t("Count", { family: familyLabel, count });
	else if (tab === "rpgAwesome") countLabel = t("CountRpgAwesome", { count });
	else if (tab === "emoji") countLabel = t("CountEmoji", { count });

	return {
		query,
		value: trimmedValue,
		isImage,
		isEmpty,
		showGrid: !isImage && !isEmpty,
		truncated: matches.length > LIMIT,
		options: matches.slice(0, LIMIT),
		countLabel,
		emptyLabel: query.trim() ? t("Empty", { query: query.trim() }) : t("EmptyAll"),
		tabs: TABS.map((candidate) => ({ value: candidate.value, label: t(candidate.labelKey), selected: candidate.value === tab })),
		families: tab === "fontAwesome"
			? FAMILIES.map((candidate) => ({ value: candidate.value, label: t(candidate.labelKey), selected: candidate.value === family, interactive: true }))
			: [{ value: tab, label: t(SINGLE_FAMILY_LABEL_KEY[tab]), selected: true, interactive: false }],
		previewClass: preview.iconClass,
		previewGlyph: preview.glyph,
		previewSrc: preview.imagePath,
		previewIsIcon: preview.kind === "icon",
		previewIsGlyph: preview.kind === "glyph",
		previewIsImage: preview.kind === "image",
		previewIsEmpty: preview.kind === "empty",
	};
};
