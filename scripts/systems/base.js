import { MODULE_ID } from "../constants.js";
/* scripts/systems/base.js */
import { defaultRegistry } from "./defaults.js";
import { ensureMacroPermission } from "../features/action-menu/actions.js";
import { buildStatusEffectChoices, setActorStatusEffect } from "./status-effects.js";

export function configProps(attr) {
	const o = {
		color: attr.color,
		style: attr.style || "bar",
		x: attr.x || 0,
		y: attr.y || 0,
		icon: attr.icon || "",
		iconImg: attr.iconImg || "",
		barScale: attr.barScale,
		dotScale: attr.dotScale ?? 1,
		numberScale: attr.numberScale ?? 1,
		badgeScale: attr.badgeScale ?? 1,
	badgeConditions: Array.isArray(attr.badgeConditions) ? attr.badgeConditions : [],
		barLabelX: attr.barLabelX || 0,
		barLabelY: attr.barLabelY || 0,
		barValueX: attr.barValueX || 0,
		barValueY: attr.barValueY || 0,
		barLabelRotation: attr.barLabelRotation || 0,
		barValueRotation: attr.barValueRotation || 0,
		barLabelVertical: attr.barLabelVertical || false,
		barValueVertical: attr.barValueVertical || false,
		numberLabelX: attr.numberLabelX || 0,
		numberLabelY: attr.numberLabelY || 0,
		numberValueX: attr.numberValueX || 0,
		numberValueY: attr.numberValueY || 0,
		textColor: attr.textColor || "#000000",
		textStrokeColor: attr.textStrokeColor || "#ffffff",
		labelColor: attr.labelColor || "",
		valueColor: attr.valueColor || "",
		labelFontSize: attr.labelFontSize,
		valueFontSize: attr.valueFontSize,
		barFrameImg: attr.barFrameImg || "",
		barBgImg: attr.barBgImg || "",
		barFillImg: attr.barFillImg || "",
		dotFilledImg: attr.dotFilledImg || "",
		dotEmptyImg: attr.dotEmptyImg || "",
		numberBgImg: attr.numberBgImg || "",
		gmOnly: attr.gmOnly || false,
		ownerOnly: attr.ownerOnly || false,
		qualitativeDisplay: attr.qualitativeDisplay || false,
		thresholdColor: attr.thresholdColor || false,
		showThresholdMarkers: attr.showThresholdMarkers || false,
		segmentedBar: attr.segmentedBar || false,
		linkedResourcePath: attr.linkedResourcePath || "",
		linkedResourceMaxPath: attr.linkedResourceMaxPath || "",
		linkedResourceLabel: attr.linkedResourceLabel || "",
		linkedBarMode: attr.linkedBarMode === "danger" ? "danger" : "remaining",
		compactVisible: attr.compactVisible || false,
		compactIconOnly: attr.compactIconOnly || false,
		hitFeedback: attr.hitFeedback || false,
		qualWoundedAt: attr.qualWoundedAt ?? 75,
		qualBloodiedAt: attr.qualBloodiedAt ?? 50,
		qualCriticalAt: attr.qualCriticalAt ?? 25,
		qualHealthyLabel: attr.qualHealthyLabel || "",
		qualWoundedLabel: attr.qualWoundedLabel || "",
		qualBloodiedLabel: attr.qualBloodiedLabel || "",
		qualCriticalLabel: attr.qualCriticalLabel || "",
		qualDeadLabel: attr.qualDeadLabel || "",
		qualHealthyColor: attr.qualHealthyColor || "#4ade80",
		qualWoundedColor: attr.qualWoundedColor || "#fbbf24",
		qualBloodiedColor: attr.qualBloodiedColor || "#f97316",
		qualCriticalColor: attr.qualCriticalColor || "#ef4444",
		qualDeadColor: attr.qualDeadColor || "#6b7280",
		thresholdWoundedAt: attr.thresholdWoundedAt ?? 75,
		thresholdBloodiedAt: attr.thresholdBloodiedAt ?? 50,
		thresholdCriticalAt: attr.thresholdCriticalAt ?? 25,
		thresholdHealthyColor: attr.thresholdHealthyColor || "#22c55e",
		thresholdWoundedColor: attr.thresholdWoundedColor || "#eab308",
		thresholdBloodiedColor: attr.thresholdBloodiedColor || "#f97316",
		thresholdCriticalColor: attr.thresholdCriticalColor || "#ef4444",
		thresholdDeadColor: attr.thresholdDeadColor || "#6b7280",
		qualitativeStages: Array.isArray(attr.qualitativeStages) ? attr.qualitativeStages : [],
		resourceThresholdStages: Array.isArray(attr.resourceThresholdStages) ? attr.resourceThresholdStages : [],
	};
	for (const [k, v] of Object.entries(attr)) {
		if (/Img(X|Y|Scale|Rotation|Opacity|W|H)$/.test(k)) {
			if (v === 0) continue;
			o[k] = v;
		}
	}
	return o;
}

const isNumericValue = (v) =>
	typeof v === "number" ||
	(typeof v === "string" && v.trim() !== "" && isFinite(Number(v)));

const unwrapNumericValue = (value, depth = 0) => {
	if (isNumericValue(value)) return Number(value);
	if (!value || typeof value !== "object" || depth > 2) return undefined;

	for (const key of [
		"value",
		"total",
		"current",
		"amount",
		"points",
		"remaining",
		"derived",
		"override",
		"base",
		"max",
		"cap",
		"limit",
		"maximum",
	]) {
		const resolved = unwrapNumericValue(value[key], depth + 1);
		if (resolved !== undefined) return resolved;
	}

	return undefined;
};

const numericValueOr = (value, fallback = 0) =>
	unwrapNumericValue(value) ?? fallback;

export function resolveBackingItem(actor, container) {
	if (!container || typeof container !== "object") return null;
	if (typeof container._id !== "string" || !container._id) return null;
	return actor.items?.get?.(container._id) ?? null;
}

export function isDerivedOnlyActorPath(actor, path) {
	if (foundry.utils.getProperty(actor, path) === undefined) return false;
	if (foundry.utils.hasProperty(actor._source, path)) return false;
	if (!path.startsWith("system.")) return false;
	try {
		if (actor.system?.schema?.getField?.(path.slice("system.".length))) return false;
	} catch (err) {
		console.warn("Nik's Action HUD | schema lookup failed for path:", path, err);
	}
	return true;
}

export function resolveConfiguredMax(actor, attr) {
	const rawMaxPath = attr?.maxPath;
	const cleanMax = String(rawMaxPath ?? "").trim();
	if (!cleanMax) return null;

	const fixedMax = unwrapNumericValue(cleanMax);
	if (fixedMax !== undefined) return fixedMax;

	const normalizedPath = cleanMax.startsWith("@") ? cleanMax.slice(1) : cleanMax;
	const value = foundry.utils.getProperty(actor, normalizedPath);
	return numericValueOr(value, 0);
}

export class BaseSystemAdapter {
	constructor() {
		this.systemId = "generic";
	}

	getStats(actor, configAttributes) {
		if (!configAttributes || configAttributes.length === 0) return [];

		const resolveTypedArrayValue = (path) => {
			if (!path || !path.includes(".")) return { found: false, value: 0, max: 0 };

			const segments = String(path).split(".");
			if (segments.length < 2) return { found: false, value: 0, max: 0 };

			const typeToken = String(segments.pop() || "").trim();
			if (!typeToken) return { found: false, value: 0, max: 0 };

			const collectionPath = segments.join(".");
			const collection = foundry.utils.getProperty(actor, collectionPath);

			if (!Array.isArray(collection) || collection.length === 0) {
				return { found: false, value: 0, max: 0 };
			}

			const normalizedToken = typeToken.toLowerCase();
			const item = collection.find((entry) => {
				if (!entry || typeof entry !== "object") return false;
				const candidates = [
					entry.type,
					entry.slug,
					entry.id,
					entry.key,
					entry.name,
					entry.label,
					entry.short,
					entry.code,
					entry.abbreviation,
				]
					.filter((candidate) => typeof candidate === "string")
					.map((candidate) => candidate.toLowerCase());
				return candidates.includes(normalizedToken);
			});

			if (!item) return { found: false, value: 0, max: 0 };

			const pickNumeric = (entry, keys) => {
				for (const key of keys) {
					const raw = foundry.utils.getProperty(entry, key);
					const resolved = unwrapNumericValue(raw);
					if (resolved !== undefined) return resolved;
				}

				for (const [key, raw] of Object.entries(entry)) {
					if (
						isNumericValue(raw) &&
						!key.toLowerCase().includes("sort") &&
						!key.toLowerCase().includes("order") &&
						!key.toLowerCase().includes("index")
					) {
						return Number(raw);
					}
				}

				return undefined;
			};

			const value = pickNumeric(item, [
				"total",
				"value",
				"current",
				"amount",
				"points",
				"used",
				"remaining",
				"speed",
				"base",
				"walk",
				"run",
				"modifier",
				"mod",
				"bonus",
				"rank",
				"level",
			]);
			const max = pickNumeric(item, [
				"max",
				"cap",
				"limit",
				"maximum",
			]);

			if (!isNumericValue(value) && !isNumericValue(max)) {
				return { found: false, value: 0, max: 0 };
			}

			return {
				found: true,
				value: isNumericValue(value) ? Number(value) : 0,
				max: isNumericValue(max) ? Number(max) : 0,
			};
		};

		return configAttributes.map((attr) => {
			if (!attr.path || attr.path.trim() === "") {
		return {
					path: "",
					label: attr.label || "New Attribute",
					value: 3,
					max: 5,
					percent: 60,
					temp: 0,
					tempPercent: 0,
					subtype: "resource",
				...configProps(attr),
		};
		}

		if (attr.path === "combat.initiative") {
				const combatant = game.combat?.combatants?.find(
					(c) => c.actorId === actor.id,
				);
				const initiative = combatant?.initiative;
				const value = Number.isFinite(initiative) ? initiative : "—";
			return {
				path: attr.path,
				label: attr.label,
				value,
				max: 0,
				percent: 100,
				subtype: "resource",
				...configProps(attr),
			};
		}

		const typedArrayResolved = resolveTypedArrayValue(attr.path);

			const rawVal = typedArrayResolved.found
				? typedArrayResolved.value
				:
				foundry.utils.getProperty(actor, `${attr.path}.value`) ??
				foundry.utils.getProperty(actor, attr.path) ??
				0;
			const parsed = Number(rawVal);
			const val = isNaN(parsed) ? (rawVal || 0) : (parsed || 0);

			let max = 0;

			const configuredMax = resolveConfiguredMax(actor, attr);

			if (configuredMax !== null) {
				max = configuredMax;
			} else if (typedArrayResolved.found) {
				max = typedArrayResolved.max;
			} else {
				const rawObj = foundry.utils.getProperty(actor, attr.path);
				if (
					typeof rawObj === "object" &&
					rawObj !== null &&
					rawObj.max !== undefined
				) {
					max = rawObj.max;
				} else if (attr.path.endsWith(".value")) {
					const autoMaxPath = attr.path.replace(".value", ".max");
					max = foundry.utils.getProperty(actor, autoMaxPath) ?? 0;
				} else {
					max = foundry.utils.getProperty(actor, `${attr.path}.max`) ?? 0;
				}
			}
			max = numericValueOr(max, 0);

			const percent = typeof val === "number" ? Math.clamp((val / (max || 1)) * 100, 0, 100) : 0;

		return {
			path: attr.path,
			label: attr.label,
			value: val,
			max: max,
			percent: percent,
			subtype: "resource",
			...configProps(attr),
		};
	});
	}

	/**
	 * [HUD] 수치를 업데이트합니다. (+, - 상대값 연산 처리)
	 * @param {Actor} actor
	 * @param {String} path
	 * @param {String} input "+10", "-5", "20" 등
	 */
	async updateAttribute(actor, path, input) {
		const raw = foundry.utils.getProperty(actor, path);
		const usesValue =
			raw && typeof raw === "object" && raw !== null && "value" in raw;
		const currentRaw = usesValue
			? raw.value
			: foundry.utils.getProperty(actor, `${path}.value`) ?? raw;
		const current = Number.isFinite(Number(currentRaw)) ? Number(currentRaw) : 0;
		let max = 0;
		if (usesValue && raw.max !== undefined) {
			max = numericValueOr(raw.max, 0);
		} else if (path.endsWith(".value")) {
			max = numericValueOr(foundry.utils.getProperty(actor, path.replace(".value", ".max")), 0);
		} else {
			max = numericValueOr(foundry.utils.getProperty(actor, `${path}.max`), 0);
		}
		if (!Number.isFinite(max)) max = 0;
		let newValue = current;

		// 문자열에 +, -가 포함되어 있으면 상대값 연산
		if (input.startsWith("+") || input.startsWith("-")) {
			const delta = Number(input);
			if (!isNaN(delta)) newValue += delta;
		} else {
			// 없으면 절대값 설정
			const val = Number(input);
			if (!isNaN(val)) newValue = val;
		}

		// 최대값이 존재하면 범위 제한 (0 ~ max), 없으면 0 이상으로만 제한
		if (max > 0) {
			newValue = Math.clamp(newValue, 0, max);
		} else {
			newValue = Math.max(0, newValue);
		}

		const container = usesValue
			? raw
			: path.endsWith(".value")
				? foundry.utils.getProperty(actor, path.slice(0, -".value".length))
				: null;
		const backingItem = resolveBackingItem(actor, container);
		if (backingItem) {
			if (typeof container.add === "function") {
				await container.add(newValue - current);
				return;
			}
			if (backingItem.system?.uses && typeof backingItem.system.uses === "object") {
				await backingItem.update({ "system.uses.value": newValue });
				return;
			}
		}

		const targetPath = usesValue ? `${path}.value` : path;

		if (isDerivedOnlyActorPath(actor, targetPath)) {
			ui.notifications?.warn(
				game.i18n.format("IBHUD.Notifications.DerivedAttributeReadOnly", {
					path: targetPath,
				}),
			);
			return;
		}

		await actor.update({ [targetPath]: newValue });
	}

	// [V14 Compatible Only]: In Foundry V14, ActiveEffect#isTemporary requires duration and no longer
	// returns true solely because statuses is populated. ActiveEffect#statuses is strictly a Set<string>.
	getConditions(actor) {
		const source = actor.appliedEffects ?? actor.effects ?? [];
		const seen = new Set();
		const conditions = [];

		for (const e of source) {
			if (e.active === false) continue;
			// [V14 Compatible Only]: ActiveEffect#statuses is strictly a Set<string> (Array support dropped)
			const hasStatus = e.statuses instanceof Set && e.statuses.size > 0;
			if (!e.isTemporary && !hasStatus) continue;

			const src = e.img || e.icon;
			if (!src) continue;
			if (e.id && seen.has(e.id)) continue;
			if (e.id) seen.add(e.id);

			conditions.push({
				id: e.id || e.flags?.core?.statusId || e.slug || e.name || "unknown",
				src,
				name: e.name || e.label || "Unknown",
				value: e.value ?? null,
			});
		}

		return conditions;
	}

	getStatusEffectChoices(actor) {
		return buildStatusEffectChoices(CONFIG.statusEffects, actor, {
			localize: (value) => game.i18n.localize(value),
		});
	}

	async addCondition(actor, statusId) {
		return setActorStatusEffect(actor, statusId, true);
	}

	async removeConditionByStatus(actor, statusId) {
		return setActorStatusEffect(actor, statusId, false);
	}

	/**
	 * [HUD] 상태 이상을 제거합니다 (우클릭)
	 * @param {Actor} actor
	 * @param {String} conditionId
	 */
	async removeCondition(actor, conditionId) {
		// 1. 표준 ActiveEffect 목록에서 탐색
		let effect = actor.effects.get(conditionId);
		if (!effect) {
			effect = actor.effects.find((e) => {
				// [V14 Compatible Only]: ActiveEffect#statuses is strictly a Set<string>
				if (e.statuses instanceof Set) return e.statuses.has(conditionId);
				return e.flags?.core?.statusId === conditionId;
			});
		}
		if (!effect) {
			effect = actor.effects.find(
				(e) => e.label === conditionId || e.name === conditionId,
			);
		}

		if (effect) {
			await effect.delete();
			if (game.user.isGM) {
				ui.notifications.info(
					`Removed condition '${effect.label || effect.name}' from ${actor.name}`,
				);
			}
			return;
		}

		// 2. 시스템 데이터 플래그 방식 시도 (CoC 등 비표준)
		// system.conditions.prone.value = true 같은 구조 탐색
		// system 객체 내에서 conditionId와 일치하는 키를 재귀적으로 찾음
		const findConditionPath = (obj, prefix, depth) => {
			if (depth > 4) return null;
			for (const [k, v] of Object.entries(obj)) {
				// 키 이름이 conditionId와 같고 (대소문자 무시), value 속성을 가진 객체라면?
				if (k.toLowerCase() === conditionId.toLowerCase()) {
					if (typeof v === "object" && v !== null && "value" in v) {
						return `${prefix}.${k}.value`;
					}
					// 혹은 그 자체가 boolean 값이라면?
					if (typeof v === "boolean") {
						return `${prefix}.${k}`;
					}
				}
				// 더 깊이 탐색
				if (typeof v === "object" && v !== null) {
					const found = findConditionPath(v, `${prefix}.${k}`, depth + 1);
					if (found) return found;
				}
			}
			return null;
		};

		if (actor.system) {
			const path = findConditionPath(actor.system, "system", 0);
			if (path) {
				// 찾았다면 false로 업데이트
				await actor.update({ [path]: false });
				if (game.user.isGM) {
					ui.notifications.info(
						`Removed condition '${conditionId}' (System Data) from ${actor.name}`,
					);
				}
				return;
			}
		}
	}

	/* =========================================
	   QUICK SLOT (FAVORITES) RESOLUTION
	   즐겨찾기 슬롯에 표시할 아이템 데이터를 반환합니다.
	   compound ID(예: save-fortitude, skill-athletics 등)는
	   시스템 어댑터에서 오버라이드해야 합니다.
	   ========================================= */

	/**
	 * 즐겨찾기 ID로부터 퀵슬롯에 표시할 {img, name}을 반환합니다.
	 * actor.items.get()으로 찾을 수 없는 synthetic/compound ID인 경우
	 * 시스템 어댑터에서 이 메서드를 오버라이드하여 처리합니다.
	 *
	 * @param {Actor} actor
	 * @param {string} itemId - 즐겨찾기에 저장된 ID
	 * @returns {{ img: string, name: string } | null}
	 */
	resolveQuickSlotData(actor, itemId) {
		return null;
	}

	/* =========================================
	   STAT ROLL INTERFACE
	   HUD 스탯 클릭 시 해당 굴림을 실행합니다.
	   ========================================= */

	/**
	 * [HUD] 스탯 경로에 해당하는 굴림을 실행합니다.
	 * 시스템 어댑터에서 오버라이드하여 rollable 스탯을 매핑합니다.
	 *
	 * @param {Actor} actor - 대상 액터
	 * @param {String} path - 스탯 경로 (예: "system.saves.fortitude.value")
	 * @param {Event} event - 클릭 이벤트 (수정자 키 전달용)
	 * @returns {Promise|null} - 굴림 Promise 또는 null (rollable하지 않은 경우)
	 */
	rollStat(actor, path, event) {
		return null;
	}

	isStatRollable(path) {
		return false;
	}

	/* =========================================
	   ACTION MENU INTERFACE
	   시스템별로 다르게 동작해야 하는 액션 메뉴 관련 메서드들입니다.
	   ========================================= */

	/**
	 * 카테고리 가시성 필터링
	 * @param {Object} visibility - { mode, actorTypes, actorIds }
	 * @param {Actor} actor
	 * @returns {boolean}
	 */
	_isCategoryVisible(visibility, actor) {
		if (!visibility || !visibility.mode || visibility.mode === "all") return true;
		if (!actor) return true;

		const actorType = actor.type;
		const actorId = actor.id;
		const types = visibility.actorTypes || [];
		const ids = visibility.actorIds || [];

		const isMatched = types.includes(actorType) || ids.includes(actorId);

		if (visibility.mode === "only") return isMatched;
		if (visibility.mode === "except") return !isMatched;

		return true;
	}

	/**
	 * 메인 액션 메뉴의 버튼 구성을 정의합니다.
	 * 상속받은 클래스(예: DnD5eAdapter)에서 이 부분을 오버라이드하여 시스템에 맞는 버튼을 제공해야 합니다.
	 *
	 * type 종류:
	 * - 'submenu': 클릭 시 서브 메뉴(리스트)를 엽니다.
	 * - 'sheet': 클릭 시 캐릭터 시트를 엽니다.
	 * - 'system': 클릭 시 즉시 특정 로직(executeAction)을 수행합니다.
	 */
	getActionCategories(actor) {
		const config = game.settings.get(MODULE_ID, "configuration");

		// 1. 설정된 메뉴가 있으면 그것을 사용
		if (config.customMenu && config.customMenu.length > 0) {
			return config.customMenu
				.map((cat, index) => ({
					id: `custom-${index}`,
					label: cat.label,
					icon: cat.icon,
					img: cat.img,

					// 버튼 배경 및 조정값
					buttonImg: cat.buttonImg,
					buttonScale: cat.buttonScale ?? 1.0,
					buttonX: cat.buttonX ?? 0,
					buttonY: cat.buttonY ?? 0,

					// per-button frame layers
					buttonFrameLayers: cat.buttonFrameLayers || [],
					buttonFrameColor: cat.buttonFrameColor || "",
					fontFamily: cat.fontFamily || "",
					textColor: cat.textColor || "",

					type: "submenu",
					cssClass: `btn-custom-${index}`,
					systemId: cat.systemId || null,
					_visibility: cat.visibility,
				}))
				.filter((cat) => this._isCategoryVisible(cat._visibility, actor));
		}

		const defaultLayout = defaultRegistry.getDefaultLayout(
			game.system.id,
			this,
		);
		if (defaultLayout && defaultLayout.length > 0) {
			return defaultLayout.map((cat, index) => ({
				id: `menu-${index}`,
				systemId: cat.systemId,
				label: cat.label,
				icon: cat.icon,
				type: "submenu",
			}));
		}

		return [];
	}

	/**
	 * 서브 메뉴를 열었을 때 보여줄 데이터(아이템/스킬 리스트)를 반환합니다.
	 * @param {Actor} actor
	 * @param {String} categoryId getActionCategories에서 정의한 id
	 */
	async getSubMenuData(actor, categoryId) {
		// [수정] ID 파싱 로직 개선 (menu-0, custom-0 모두 대응)
		const parts = categoryId.split("-");
		const index = parseInt(parts[parts.length - 1]);

		const config = game.settings.get(MODULE_ID, "configuration");

		// 1. 우선 커스텀 설정(customMenu)에서 데이터를 찾아봅니다.
		let menuData = config.customMenu?.[index];

		if (!menuData || categoryId.startsWith("menu-")) {
			const defaultLayout = defaultRegistry.getDefaultLayout(
				game.system.id,
				this,
			);
			if (defaultLayout[index]) {
				menuData = defaultLayout[index];
			}
		}

		// 여전히 데이터가 없으면 빈 리스트 반환
		if (!menuData) return { title: "", items: [] };

		// ★ [Case A] 시스템 고유 ID가 있는 경우 (예: "attack", "magic")
		if (menuData.systemId) {
			return await this._getSystemSubMenuData(actor, menuData.systemId, menuData);
		}

		// ★ [Case B] 순수 커스텀 메뉴
		return this._getCustomSubMenuData(actor, menuData, index);
	}

	/**
	 * 시스템 데이터 로드 헬퍼
	 * 자식 클래스(dnd5e/pf2e)에서 이 부분을 오버라이드하거나,
	 * 기존 스위치문을 여기로 옮겨옵니다.
	 */
	async _getSystemSubMenuData(actor, systemId, menuData) {
		// 기본적으로 빈 데이터 반환 (각 시스템 어댑터에서 오버라이드 필요)
		return { title: menuData.label, items: [] };
	}

	/**
	 * 커스텀 메뉴 데이터 처리 로직 (기존 로직 분리)
	 */
	_getCustomSubMenuData(actor, menuData, index) {
		const useSidebar = menuData.useSidebar === true;
		const personalMap = actor.getFlag(MODULE_ID, "personalMap") || {};

		// 데이터 구조 초기화
		const items = {};
		const tabLabels = {};
		const subTabLabels = {};

		if (menuData.tabs) {
			menuData.tabs.forEach((tab, tIdx) => {
				let sKey = "";
				let tKey = "";
				let sLabel = "";
				let tLabel = "";

				if (useSidebar) {
					sLabel = tab.label || "General";

					// ★ [복구] tab-숫자 대신 원래대로 이름 기반 키(Key)를 사용합니다.
					// 그래야 같은 이름의 탭들이 하나의 사이드바 메뉴로 뭉칩니다.
					sKey = sLabel.replace(/\s+/g, "_").toLowerCase();

					tLabel = tab.subLabel || "All";

					// ★ [중요] 여기가 진짜 인덱스(tIdx)를 가지고 있습니다.
					tKey = `tab-${tIdx}`;
				} else {
					// 사이드바를 안 쓸 때는 메인 탭이 인덱스 키를 가집니다.
					sKey = `tab-${tIdx}`;
					sLabel = tab.label || "General";
				}

				if (useSidebar) {
					if (!items[sKey]) {
						items[sKey] = {};
						tabLabels[sKey] = sLabel;
						subTabLabels[sKey] = {};
					}
					if (!items[sKey][tKey]) {
						items[sKey][tKey] = [];
						subTabLabels[sKey][tKey] = tLabel;
					}
				} else {
					if (!items[sKey]) {
						items[sKey] = [];
						tabLabels[sKey] = sLabel;
					}
				}

				const targetArray = useSidebar ? items[sKey][tKey] : items[sKey];

				// (A) 공용 아이템
				if (tab.items) {
					tab.items.forEach((savedItem, iIdx) => {
						this._processCustomItem(savedItem, targetArray, false, {
							catIdx: index,
							tabIdx: tIdx,
							itemIdx: iIdx,
						});
					});
				}

				// (B) 개인 아이템
				const pKey = `${index}-${tIdx}`;
				const personalItems = personalMap[pKey];
				if (personalItems) {
					if (targetArray.length > 0) {
						targetArray.push({ isHeader: true, name: "Personal" });
					}
					personalItems.forEach((pItem, pIdx) => {
						this._processCustomItem(pItem, targetArray, true, {
							catIdx: index,
							tabIdx: tIdx,
							itemIdx: pIdx,
						});
					});
				}
			});
		}

		return {
			title: menuData.label,
			theme: "blue",
			hasTabs: true,
			hasSubTabs: useSidebar,
			items: items,
			tabLabels: tabLabels,
			subTabLabels: subTabLabels,
		};
	}

	/**
	 * [Helper] 아이템 처리 및 리스트 추가 (중복 제거용)
	 */
	_processCustomItem(savedItem, targetArray, isPersonal, personalMeta = {}) {
		if (!savedItem || !savedItem.id || !savedItem.type) {
			console.warn("Nik's Action HUD | Invalid custom item data skipped:", savedItem);
			return;
		}

		if (savedItem.type === "Macro") {
			targetArray.push({
				id: `macro-${savedItem.id}`,
				name: savedItem.name || "Unknown Macro",
				img: savedItem.img || "icons/svg/dice-target.svg",
				cost: "",
				description: savedItem.flavor || "Macro",
				globalFlavor: !isPersonal ? (savedItem.flavor || "") : "",
				isPersonal: isPersonal,
				customCatIndex: personalMeta.catIdx,
				customTabIndex: personalMeta.tabIdx,
				customItemIndex: personalMeta.itemIdx,
			});
			return;
		}
	}

	/**
	 * 'system' 타입의 버튼을 눌렀을 때 실행되는 로직입니다.
	 * 예: 방어(Guard), 닷지, 특정 굴림 등 즉발성 액션
	 */
	async executeAction(actor, actionId) {
		// 기본 어댑터는 특별한 시스템 룰이 없습니다.
	}

	/**
	 * 서브 메뉴 리스트에서 아이템을 클릭했을 때의 동작입니다.
	 * 보통 아이템 사용(Roll)이나 매크로 실행이 됩니다.
	 */
	async useItem(actor, itemId, event = null) {
		if (itemId.startsWith("macro-")) {
			const uuid = itemId.replace("macro-", "");
			const macro = await fromUuid(uuid) || game.macros.get(uuid);

			if (macro) {
				await ensureMacroPermission(macro);
				return macro.execute({ actor: actor, token: actor.token });
			} else {
				ui.notifications.warn(`Macro not found: ${uuid}`);
				return;
			}
		}

		// ============================================================
		// [2] 아이템 실행 처리 (기존 로직)
		// ============================================================

		// 1. 아이템 객체 찾기
		let item = actor.items.get(itemId);
		if (!item && this.findSyntheticItem) {
			item = this.findSyntheticItem(actor, itemId);
		}

		if (!item) {
			// 여기가 실행되어 "Item not found" 에러가 떴던 것입니다.
			ui.notifications.warn(`Item not found: ${itemId}`);
			return;
		}

		// ... (이하 기존의 use(), roll() 등 아이템 실행 로직 그대로 유지) ...
		if (typeof item.use === "function") return item.use();
		if (typeof item.roll === "function") return item.roll();
		if (typeof item.toChat === "function") return item.toChat();
		if (typeof item.toMessage === "function") return item.toMessage();

		// Fallback
		const sysId = game.system.id;
		const sysObj = game[sysId];

		if (sysObj) {
			if (typeof sysObj.rollItemMacro === "function")
				return sysObj.rollItemMacro(item.name);
			if (sysObj.utility?.rollItemMacro)
				return sysObj.utility.rollItemMacro(item.name, item.type, item);
		}

		return item.sheet.render(true);
	}

	/**
	 * [Helper] 매크로 저장용 폴더를 가져오거나 생성합니다.
	 */
	async _getStorageFolder(actorName) {
		const rootName = "Action HUD Macros";

		// 1. 루트 폴더 찾기 (없으면 생성)
		// depth가 없거나(구버전) parent가 없는 폴더
		let root = game.folders.find(
			(f) => f.name === rootName && f.type === "Macro" && !f.folder,
		);

		if (!root) {
			root = await Folder.create({
				name: rootName,
				type: "Macro",
				color: "#e61c34",
				sorting: "a",
			});
		}

		// 아이템에 액터가 없다면(월드 아이템 등) 루트 폴더 반환
		if (!actorName) return root;

		// 2. 액터 서브 폴더 찾기 (없으면 생성)
		// 이름이 액터 이름과 같고, 부모가 root인 폴더
		let subFolder = game.folders.find(
			(f) =>
				f.name === actorName && f.type === "Macro" && f.folder?.id === root.id,
		);

		if (!subFolder) {
			subFolder = await Folder.create({
				name: actorName,
				type: "Macro",
				folder: root.id, // 부모 지정
				sorting: "a",
			});
		}

		return subFolder;
	}

	/**
	 * [FIXED] 시스템 매크로를 생성하고, 전용 폴더로 정리합니다.
	 */
	async createSystemMacro(dropData) {
		if (dropData.type !== "Item") return null;
		const item = await Item.fromDropData(dropData);
		if (!item) return null;

		// 1. 아이템의 주인을 확인하여 저장할 폴더 결정
		const actorName = item.actor?.name || item.parent?.name || null;
		const folder = await this._getStorageFolder(actorName);

		// 2. 중복 방지 (해당 폴더 내에 이미 있는지 확인)
		const existing = game.macros.find(
			(m) =>
				m.name === item.name &&
				m.command.includes(item.id) &&
				m.folder?.id === folder.id,
		);
		if (existing) return existing;

		// ============================================================
		// [Trap] createMacro 훅으로 낚아채기 + 폴더 이동
		// ============================================================
		let hookId = null;

		try {
			const macro = await new Promise((resolve) => {
				let resolved = false;

				hookId = Hooks.once(
					"createMacro",
					async (document, options, userId) => {
						if (userId === game.user.id) {
							resolved = true;

							// ★ 생성된 매크로를 즉시 해당 액터 폴더로 이동
							if (document.folder?.id !== folder.id) {
								await document.update({ folder: folder.id });
							}

							resolve(document);
							return false;
						}
					},
				);

				// 미끼 투척
				Hooks.call("hotbarDrop", ui.hotbar, dropData, 50);

				setTimeout(() => {
					if (!resolved) resolve(null);
				}, 500);
			});

			if (macro) return macro;
		} catch (err) {
			console.warn("Nik's Action HUD | Macro trap failed:", err);
		} finally {
			if (hookId) Hooks.off("createMacro", hookId);
		}

		// ============================================================
		// [Fallback] 범용 매크로 (폴더 지정 생성)
		// ============================================================

		const command = `const item = await fromUuid("${item.uuid}"); 
if (item) item.use ? item.use() : (item.roll ? item.roll() : item.sheet.render(true));`;

		return await Macro.create({
			name: item.name,
			type: "script",
			img: item.img,
			command: command,
			folder: folder.id, // ★ 생성 시 바로 폴더 지정
			flags: { [MODULE_ID]: { sourceId: item.uuid } },
		});
	}

	/* --- Legacy Helpers (하위 호환성을 위해 남겨둠, 필요 시 삭제 가능) --- */

	getWeapons(actor) {
		return [];
	}

	getSpells(actor) {
		return {};
	}

	/**
	 * [설정창] 추적 가능한 속성 목록을 자동 추천해줍니다.
	 * Base 어댑터는 system 객체를 재귀적으로 순회하여 숫자형 데이터를 찾습니다.
	 */
	getTrackableAttributes(actor) {
		const paths = [];
		if (!actor.system) return paths;

		const toReadableLabel = (key) => {
			const text = String(key || "");
			if (!text) return "Unknown";
			if (text.length <= 4) return text.toUpperCase();
			return text.charAt(0).toUpperCase() + text.slice(1);
		};

		const getTypedEntryKey = (entry) => {
			const candidates = [
				entry?.type,
				entry?.slug,
				entry?.id,
				entry?.key,
				entry?.name,
				entry?.label,
				entry?.short,
				entry?.code,
				entry?.abbreviation,
			];
			return candidates.find((candidate) => typeof candidate === "string" && candidate.trim() !== "") || null;
		};

		const getTypedEntryValue = (entry) => {
			const byKey = [
				entry?.total,
				entry?.value,
				entry?.current,
				entry?.amount,
				entry?.points,
				entry?.used,
				entry?.remaining,
				entry?.speed,
				entry?.base,
				entry?.walk,
				entry?.run,
				entry?.modifier,
				entry?.mod,
				entry?.bonus,
				entry?.rank,
				entry?.level,
			];
			const direct = byKey.find((candidate) => typeof candidate === "number");
			if (typeof direct === "number") return direct;

			for (const [key, raw] of Object.entries(entry || {})) {
				if (
					typeof raw === "number" &&
					!key.toLowerCase().includes("sort") &&
					!key.toLowerCase().includes("order") &&
					!key.toLowerCase().includes("index")
				) {
					return raw;
				}
			}

			return undefined;
		};

		const flatten = (obj, prefix, depth) => {
			if (depth > 5) return; // CoC 같은 깊은 구조 대응을 위해 깊이 제한을 5로 상향

			for (const [k, v] of Object.entries(obj)) {
			// 1. 값 자체가 숫자(또는 숫자형 문자열)인 경우 (직접 트래킹)
			if (isNumericValue(v)) {
					paths.push({
						path: `${prefix}.${k}`,
						label: k.toUpperCase(),
					});
				}
				// 2. 객체인 경우
				else if (typeof v === "object" && v !== null) {
					if (Array.isArray(v)) {
						v.forEach((entry) => {
							if (!entry || typeof entry !== "object") return;

							const typeKey = getTypedEntryKey(entry);
							const typedValue = getTypedEntryValue(entry);
							if (!typeKey || typeof typedValue !== "number") return;

							const normalizedType = String(typeKey).trim().replace(/\s+/g, "-").toLowerCase();
							const baseLabel = String(k || "").toLowerCase().includes("speed")
								? "Speed"
								: toReadableLabel(k);
							const typeLabel = toReadableLabel(typeKey);

							paths.push({
								path: `${prefix}.${k}.${normalizedType}`,
								label: `${baseLabel}: ${typeLabel}`,
							});
						});
						continue;
					}

				// 2-a. value 속성이 있고, 그게 숫자인 경우 (CoC: attribs.hp.value)
				if ("value" in v && isNumericValue(v.value)) {
						const label = toReadableLabel(k);
						paths.push({
							path: `${prefix}.${k}.value`,
							label: label,
						});
					}
				// 2-b. max 속성이 있고 숫자인 경우 (value가 없더라도 max가 있으면 트래킹 가능)
				else if ("max" in v && isNumericValue(v.max)) {
						const label = toReadableLabel(k);
						paths.push({
							path: `${prefix}.${k}`, // 객체 자체를 가리킴 (getStats가 value/max 파싱함)
							label: label,
						});
					}
					// 2-c. 더 깊이 탐색
					else {
						flatten(v, `${prefix}.${k}`, depth + 1);
					}
				}
			}
		};

		try {
			flatten(actor.system, "system", 0);
		} catch (e) {
			console.warn("Nik's Action HUD | Error scanning attributes:", e);
		}

		const uniquePaths = Array.from(
			new Map(paths.map((entry) => [entry.path, entry])).values(),
		);

		return uniquePaths.sort((a, b) => a.label.localeCompare(b.label));
	}

	/**
	 * [설정] 시스템별 기본 트래킹 속성 목록 반환
	 * (config.js에서 초기화/리셋 시 사용됨)
	 */
	getDefaultAttributes() {
		// 범용 기본값: HP만
		return [
			{
				path: "system.attributes.hp",
				label: "HP",
				color: "#e61c34",
				style: "bar",
			},
		];
	}

	/**
	 * [설정] 시스템별 기본 상태이상 프리셋 반환
	 */
	getDefaultStatusEffects() {
		return [
			{
				id: "dead",
				label: "Dead / 사망",
				filters: {
					grayscale: 100,
					brightness: 50,
					contrast: 120,
					blur: 0,
					saturate: 0,
					sepia: 0,
				},
				overlayPath: "icons/svg/skull.svg",
				overlayScale: 1.0,
				overlayX: 0,
				overlayY: 0,
				overlayOpacity: 0.8,
				overlayBlend: "normal",
				animation: "pulse", // 오버레이: 둥둥 뜸
				tintColor: "#000000",
				tintAlpha: 0.6,
				tintAnimation: "",
			},
		];
	}
}
