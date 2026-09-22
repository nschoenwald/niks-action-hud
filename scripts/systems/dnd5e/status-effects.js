export function getDefaultStatusEffects() {
	return [
		// 1. 사망 (Dead) - 흑백 처리 + 붉은 맥동 없음
		{
			id: "dead",
			label: game.i18n.localize("IBHUD.Status.Dead"),
			filters: {
				grayscale: 100,
				brightness: 40,
				contrast: 120,
				blur: 0,
				saturate: 0,
				sepia: 0,
			},
			overlayPath: "icons/svg/skull.svg",
			overlayScale: 1.0,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.9,
			overlayBlend: "normal",
			animation: "pulse",
			tintColor: "#000000",
			tintAlpha: 0.7,
			tintAnimation: "",
		},
		// 2. 기절 (Unconscious) - 어둡고 흐릿함 + 심장박동 틴트
		{
			id: "unconscious",
			label: game.i18n.localize("IBHUD.Status.Unconscious"),
			filters: {
				grayscale: 60,
				brightness: 50,
				contrast: 100,
				blur: 2,
				saturate: 0,
				sepia: 0,
			},
			overlayPath: "icons/svg/unconscious.svg",
			overlayScale: 1.0,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.8,
			overlayBlend: "normal",
			animation: "pulse",
			tintColor: "#000000",
			tintAlpha: 0.5,
			tintAnimation: "heartbeat",
		},
		// 3. 중독 (Poisoned) - 녹색 틴트 + 흔들리는 독 아이콘
		{
			id: "poisoned",
			label: game.i18n.localize("IBHUD.Status.Poisoned"),
			filters: {
				grayscale: 0,
				brightness: 90,
				contrast: 100,
				blur: 1,
				saturate: 100,
				sepia: 30,
			},
			overlayPath: "icons/svg/acid.svg",
			overlayScale: 0.6,
			overlayX: 40,
			overlayY: -40, // 우측 상단
			overlayOpacity: 0.9,
			overlayBlend: "normal",
			animation: "shake",
			tintColor: "#00ff00",
			tintAlpha: 0.25,
			tintAnimation: "pulse",
		},
		// 4. 실명 (Blinded) - 매우 어두움 (시야 차단)
		{
			id: "blinded",
			label: game.i18n.localize("IBHUD.Status.Blinded"),
			filters: {
				grayscale: 100,
				brightness: 20,
				contrast: 150,
				blur: 3,
				saturate: 0,
				sepia: 0,
			},
			overlayPath: "icons/svg/blind.svg",
			overlayScale: 1.2,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.5,
			overlayBlend: "screen",
			animation: "",
			tintColor: "#000000",
			tintAlpha: 0.85,
			tintAnimation: "",
		},
		// 5. 투명 (Invisible) - 반투명 + 푸른빛 + 흐릿함
		{
			id: "invisible",
			label: game.i18n.localize("IBHUD.Status.Invisible"),
			filters: {
				grayscale: 0,
				brightness: 110,
				contrast: 80,
				blur: 2,
				saturate: 50,
				sepia: 0,
			},
			overlayPath: "icons/svg/mystery-man.svg",
			overlayScale: 0.8,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.3,
			overlayBlend: "overlay",
			animation: "pulse",
			tintColor: "#aaffff",
			tintAlpha: 0.3,
			tintAnimation: "pulse",
		},
		// 6. 공포 (Frightened) - 보라빛 틴트 + 덜덜 떨림(Shake)
		{
			id: "frightened",
			label: game.i18n.localize("IBHUD.Status.Frightened"),
			filters: {
				grayscale: 0,
				brightness: 80,
				contrast: 120,
				blur: 0,
				saturate: 50,
				sepia: 20,
			},
			overlayPath: "icons/svg/terror.svg", // 또는 aura.svg
			overlayScale: 1.0,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.0,
			overlayBlend: "normal",
			animation: "", // 아이콘은 숨김 (틴트로 표현)
			tintColor: "#330033",
			tintAlpha: 0.4,
			tintAnimation: "shake",
		},
		// 7. 기절/멍함 (Stunned) - 핑 도는 효과 (Spin) + 노란색
		{
			id: "stunned",
			label: game.i18n.localize("IBHUD.Status.Stunned"),
			filters: {
				grayscale: 0,
				brightness: 120,
				contrast: 100,
				blur: 4,
				saturate: 100,
				sepia: 0,
			},
			overlayPath: "icons/svg/daze.svg",
			overlayScale: 1.5,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.4,
			overlayBlend: "screen",
			animation: "spin",
			tintColor: "#ffff00",
			tintAlpha: 0.15,
			tintAnimation: "pulse",
		},
		// 8. 마비 (Paralyzed) - 글리치(지지직) + 정지된 느낌
		{
			id: "paralyzed",
			label: game.i18n.localize("IBHUD.Status.Paralyzed"),
			filters: {
				grayscale: 50,
				brightness: 100,
				contrast: 150,
				blur: 0,
				saturate: 0,
				sepia: 0,
			},
			overlayPath: "icons/svg/paralysis.svg",
			overlayScale: 1.0,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.8,
			overlayBlend: "normal",
			animation: "glitch",
			tintColor: "#ffffaa",
			tintAlpha: 0.2,
			tintAnimation: "glitch",
		},
		// 9. 석화 (Petrified) - 완전한 돌 질감 (Sepia/Gray)
		{
			id: "petrified",
			label: game.i18n.localize("IBHUD.Status.Petrified"),
			filters: {
				grayscale: 100,
				brightness: 70,
				contrast: 150,
				blur: 0,
				saturate: 0,
				sepia: 100,
			}, // Sepia 100%
			overlayPath: "icons/svg/statue.svg",
			overlayScale: 1.0,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.3,
			overlayBlend: "overlay",
			animation: "",
			tintColor: "#665544",
			tintAlpha: 0.4,
			tintAnimation: "",
		},
		// 10. 매혹 (Charmed) - 핑크빛 틴트 + 부드러운 Pulse
		{
			id: "charmed",
			label: game.i18n.localize("IBHUD.Status.Charmed"),
			filters: {
				grayscale: 0,
				brightness: 110,
				contrast: 110,
				blur: 1,
				saturate: 150,
				sepia: 0,
			},
			overlayPath: "",
			overlayScale: 1.0,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0,
			overlayBlend: "normal",
			animation: "",
			tintColor: "#ff69b4",
			tintAlpha: 0.3,
			tintAnimation: "pulse",
		},
		// 11. 구속/잡힘 (Restrained/Grappled) - 그물 오버레이
		{
			id: "restrained",
			label: game.i18n.localize("IBHUD.Status.Restrained"),
			filters: {
				grayscale: 0,
				brightness: 90,
				contrast: 100,
				blur: 0,
				saturate: 80,
				sepia: 0,
			},
			overlayPath: "icons/svg/net.svg",
			overlayScale: 1.1,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.8,
			overlayBlend: "multiply",
			animation: "",
			tintColor: "#000000",
			tintAlpha: 0.2,
			tintAnimation: "",
		},
		// 12. 탈진 (Exhaustion) - 흐릿함(Blur) + 채도 감소
		{
			id: "exhaustion",
			label: game.i18n.localize("IBHUD.Status.Exhaustion"),
			filters: {
				grayscale: 50,
				brightness: 90,
				contrast: 90,
				blur: 2.5,
				saturate: 50,
				sepia: 20,
			},
			overlayPath: "icons/svg/downgrade.svg",
			overlayScale: 0.5,
			overlayX: 45,
			overlayY: 45, // 우측 하단
			overlayOpacity: 0.8,
			overlayBlend: "normal",
			animation: "pulse",
			tintColor: "#555555",
			tintAlpha: 0.3,
			tintAnimation: "",
		},
		// 13. 넘어짐 (Prone) - 아이콘 표시
		{
			id: "prone",
			label: game.i18n.localize("IBHUD.Status.Prone"),
			filters: {
				grayscale: 0,
				brightness: 100,
				contrast: 100,
				blur: 0,
				saturate: 100,
				sepia: 0,
			},
			overlayPath: "icons/svg/falling.svg",
			overlayScale: 0.8,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.9,
			overlayBlend: "normal",
			animation: "",
			tintColor: "#000000",
			tintAlpha: 0.1,
			tintAnimation: "",
		},
		// 14. 화상 (Burning/Fire) - 붉은 섬광(Flash)
		{
			id: "burning",
			label: game.i18n.localize("IBHUD.Status.Burning"),
			filters: {
				grayscale: 0,
				brightness: 110,
				contrast: 130,
				blur: 0,
				saturate: 150,
				sepia: 50,
			},
			overlayPath: "icons/svg/fire.svg",
			overlayScale: 1.0,
			overlayX: 0,
			overlayY: 20, // 하단에서 불길이
			overlayOpacity: 0.7,
			overlayBlend: "screen",
			animation: "flash",
			tintColor: "#ff4400",
			tintAlpha: 0.3,
			tintAnimation: "flash",
		},
		// 15. 출혈/부상 (Bleeding) - 붉은 틴트 박동(Heartbeat)
		{
			id: "bleeding",
			label: game.i18n.localize("IBHUD.Status.Bleeding"),
			filters: {
				grayscale: 0,
				brightness: 90,
				contrast: 120,
				blur: 0,
				saturate: 80,
				sepia: 0,
			},
			overlayPath: "icons/svg/blood.svg",
			overlayScale: 1.2,
			overlayX: 0,
			overlayY: 0,
			overlayOpacity: 0.4,
			overlayBlend: "multiply",
			animation: "heartbeat",
			tintColor: "#880000",
			tintAlpha: 0.3,
			tintAnimation: "heartbeat",
		},
	];
}

/**
 * 수정할 자원 정보 추출
 */
export function getResourceForEdit(actor, itemId) {
	const realId = itemId.split("_")[0];

	// 1. 리소스 트래커
	if (realId.startsWith("res-")) {
		const resKey = realId.replace("res-", "");
		const res = actor.system.resources?.[resKey];
		if (res) {
			return {
				itemName: res.label || resKey.toUpperCase(),
				label: game.i18n.localize("IBHUD.Dnd5e.ResourceValue"),
				value: res.value ?? 0,
				max: res.max,
				path: `system.resources.${resKey}.value`,
				isItem: false,
			};
		}
	}

	const item = actor.items.get(realId);
	if (!item) {
		return null;
	}

	// 2. 주문 (Spells)
	if (item.type === "spell") {
		const prep = item.system.method ?? "prepared";
		const lvl = item.system.level;

		if (prep === "pact") {
			return {
				itemName: "Pact Magic",
				label: "Pact Slots",
				value: actor.system.spells?.pact?.value ?? 0,
				max: actor.system.spells?.pact?.max,
				path: "system.spells.pact.value",
				isItem: false,
			};
		} else if (lvl === 0 || prep === "atwill" || prep === "innate") {
			// Innate 주문도 제한이 있다면 Uses를 씀 (아래 로직으로 넘어감)
		} else if (prep === "prepared" || prep === "always" || !prep) {
			const key = `spell${lvl}`;
			const slots = actor.system.spells?.[key];
			if (slots && slots.max > 0) {
				return {
					itemName: `Level ${lvl} Spells`,
					label: "Spell Slots",
					value: slots.value ?? 0,
					max: slots.max,
					path: `system.spells.${key}.value`,
					isItem: false,
				};
			}
		}
	}

	// 3. 아이템 사용 횟수 (Uses) - Feature는 보통 여기에 해당
	if (
		item.system.uses &&
		(item.system.uses.max || item.system.uses.value > 0)
	) {
		// D&D 5e 최신 버전은 spent를 저장소로 사용함
		const isSpentLogic = item.system.uses.spent !== undefined;

		return {
			itemName: item.name,
			label: "Charges / Uses",
			value: item.system.uses.value ?? 0, // 보여줄 때는 '남은 횟수'
			max: item.system.uses.max,

			// spent가 존재하면 경로를 spent로 변경하고 플래그 세움
			path: isSpentLogic ? "system.uses.spent" : "system.uses.value",
			isSpent: isSpentLogic,

			isItem: true,
			itemId: item.id,
		};
	}

	// 4. 수량 (Quantity)
	if (item.system.quantity !== undefined) {
		if (
			item.system.quantity > 1 ||
			["consumable", "loot", "tool"].includes(item.type)
		) {
			return {
				itemName: item.name,
				label: "Quantity",
				value: item.system.quantity,
				max: null,
				path: "system.quantity",
				isItem: true,
				itemId: item.id,
			};
		}
	}

	return null;
}

/**
 * 탭 ID(레벨)로 주문 슬롯 정보 반환
 */
export function getSpellSlotInfo(actor, tabId) {
	// 1. Pact Magic
	if (tabId === "pact") {
		const pact = actor.system.spells?.pact;
		if (pact && pact.max > 0) {
			return {
				label: "Pact Magic",
				value: pact.value,
				max: pact.max,
				path: "system.spells.pact.value",
			};
		}
	}

	// 2. Spell Levels (1~9)
	const lvl = parseInt(tabId);
	if (!isNaN(lvl) && lvl > 0) {
		const key = `spell${lvl}`;
		const slots = actor.system.spells?.[key];
		if (slots && slots.max > 0) {
			return {
				label: `Level ${lvl} Slots`,
				value: slots.value,
				max: slots.max,
				path: `system.spells.${key}.value`,
			};
		}
	}

	// 0레벨(Cantrip)이나 Innate 등은 슬롯 수정 대상 아님
	return null;
}

/**
 * 아이템 복구 (Restore)
 * - Uses/Charges가 있는 아이템을 최대치로 회복
 */
export async function restoreItem(actor, itemId) {
	// 1. 리소스 트래커(res-*) 복구 지원
	if (itemId.startsWith("res-")) {
		const resKey = itemId.replace("res-", "");
		const res = actor.system.resources?.[resKey];
		if (res && res.max > 0) {
			await actor.update({ [`system.resources.${resKey}.value`]: res.max });
			return true;
		}
		return false;
	}

	// 2. 일반 아이템 복구
	const item = actor.items.get(itemId);
	if (!item) return false;

	const uses = item.system.uses;
	if (uses) {
		// A. 신버전 (Spent) 기반
		if (uses.spent !== undefined) {
			// 이미 0이면(사용 안했으면) 굳이 업데이트 안 함 (하지만 강제 복구라 그냥 0으로)
			await item.update({ "system.uses.spent": 0 });
			return true;
		}
		// B. 구버전 (Value/Max) 기반
		else if (uses.max > 0) {
			await item.update({ "system.uses.value": uses.max });
			return true;
		}
	}

	return false;
}
