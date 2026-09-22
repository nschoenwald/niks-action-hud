/* =========================================
   INTERNAL HELPERS
   ========================================= */

export function _getWeapons(actor) {
	return actor.items
		.filter((i) => i.type === "weapon" && i.system.equipped)
		.map((i) => {
			// 1. D&D 5e 시스템이 미리 계산해둔 라벨 가져오기
			const damageFormula = i.labels.damage || ""; // 예: "1d8 + 3"
			const damageType = i.labels.damageTypes || ""; // 예: "Slashing" (한글화 시 "베기")
			const toHit = i.labels.toHit || ""; // 예: "+5"

			let displayHtml = "";

			// 2. [Case A] 데미지가 있는 무기 (대부분의 경우)
			if (damageFormula) {
				displayHtml = `
                        <div style="display:flex; flex-direction:column; align-items:flex-end; line-height:1.1;">
                            <span class="ib-info-main" style="font-weight:bold; font-size:0.95em;">${damageFormula}</span>
                            <span class="ib-info-sub" style="font-size:0.7em; text-transform:uppercase; letter-spacing:0.5px;">${damageType}</span>
                        </div>
                    `;
			}
			// 3. [Case B] 데미지는 없는데 명중 굴림은 있는 경우 (예: 그물, 마법 무기 효과 등)
			else if (toHit) {
				displayHtml = `<span style="color:#aaa; font-size:0.9em;">Hit: ${toHit}</span>`;
			}
			// 4. [Case C] 그 외 특수 장비 (속성 표시)
			else {
				// properties가 배열일 수도, 문자열일 수도 있음
				const props = Array.isArray(i.labels.properties)
					? i.labels.properties.map((p) => p.label).join(", ")
					: i.labels.properties || "";
				displayHtml = `<span style="color:#666; font-size:0.75em;">${props}</span>`;
			}

			return {
				id: i.id,
				name: i.name,
				img: i.img,
				description: i.system.description.value,
				// cost 필드에 HTML을 넣어주면 Action Menu가 그대로 렌더링합니다.
				cost: displayHtml,
			};
		});
}

export function _getSpells(actor) {
	const items = actor.items.filter((i) => i.type === "spell");
	const spells = {};
	const labels = {};

	// 0~9 레벨 초기화 및 라벨 생성 (기존 유지)
	for (let i = 0; i <= 9; i++) {
		spells[i] = [];
		if (i === 0) {
			labels[i] = "C";
		} else {
			const slots = actor.system.spells[`spell${i}`];
			if (slots && slots.max > 0) {
				labels[i] = `${i} (${slots.value}/${slots.max})`;
			} else {
				labels[i] = `${i}`;
			}
		}
	}

	// Pact Magic 라벨 처리 (기존 유지)
	if (actor.system.spells.pact && actor.system.spells.pact.max > 0) {
		const pact = actor.system.spells.pact;
		labels[pact.level] = `P${pact.level} (${pact.value}/${pact.max})`;
	}

	items.forEach((i) => {
		const lvl = i.system.level ?? 0;

		if (spells[lvl]) {
			// 주문 구성 요소(V,S,M) 파싱 로직 강화
			// [V14 Compatible Only]: In DnD5e v6+ / Foundry V14, system.properties is strictly a Set<string>.
			// Legacy Array support from older versions has been dropped.
			const compList = [];
			const props = i.system.properties;
			if (props instanceof Set) {
				if (props.has("vocal")) compList.push("V");
				if (props.has("somatic")) compList.push("S");
				if (props.has("material")) compList.push("M");
			}

			const compStr = compList.join(", ");
			const descRaw = i.system.description?.value || "";

			spells[lvl].push({
				id: i.id,
				name: i.name,
				img: i.img,
				cost: compStr, // 우측에 V, S, M 표시
				description: descRaw,
			});
		}
	});

	return { items: spells, labels: labels };
}

// 피처(Features) 및 리소스 목록
export function _getFeatures(actor) {
	const items = [];
	const res = actor.system.resources;
	if (res) {
		["primary", "secondary", "tertiary"].forEach((r) => {
			if (res[r] && res[r].max > 0 && res[r].label) {
				items.push({
					id: `res-${r}`,
					name: `${res[r].label} <span style="color:#00dbff; font-size:0.8em">(${res[r].value}/${res[r].max})</span>`,
					img: "icons/svg/light.svg",
					favoritable: false,
					cost: "",
					description: "Resource Tracked",
				});
			}
		});
	}
	actor.items.forEach((i) => {
		if (i.type === "feat") {
			const uses = i.system.uses;
			if (uses && (uses.max > 0 || uses.value > 0)) {
				items.push({
					id: i.id,
					name: i.name,
					img: i.img,
					cost: `${uses.value}/${uses.max}`,
					description: i.system.description.value,
				});
			}
		}
	});
	return items;
}

// 소모품(Consumables) 목록
export function _getConsumables(actor) {
	const items = [];

	actor.items.forEach((i) => {
		// 타입이 소모품(consumable)이거나 전리품(loot) 중 수량이 있는 것
		if (
			i.type === "consumable" ||
			(i.type === "loot" && i.system.quantity > 0)
		) {
			items.push({
				id: i.id,
				name: i.name,
				img: i.img,
				cost: `x${i.system.quantity}`, // 우측에 수량 표시
			});
		}
	});

	return items;
}

// 값 업데이트 (+/- 처리 포함)
export async function updateAttribute(actor, path, input) {
	// [CASE A] 아이템 업데이트 (기존과 동일)
	if (path.startsWith("items.")) {
		const parts = path.split(".");
		const itemId = parts[1];
		const property = parts[2]; // 'uses' or 'quantity'

		const item = actor.items.get(itemId);
		if (!item) return;

		let current = 0;
		let max = 0;
		let updatePath = "";

		if (property === "uses") {
			const isSpentLogic = item.system.uses?.spent !== undefined;
			current = item.system.uses?.value ?? 0;
			max = item.system.uses?.max ?? 0;
			updatePath = isSpentLogic ? "system.uses.spent" : "system.uses.value";
		} else if (property === "quantity") {
			current = item.system.quantity ?? 0;
			max = 9999;
			updatePath = "system.quantity";
		}

		let newValue = current;
		if (input.startsWith("+") || input.startsWith("-")) {
			newValue += Number(input);
		} else {
			newValue = Number(input);
		}

		if (max > 0) newValue = Math.clamp(newValue, 0, max);
		else newValue = Math.max(0, newValue);

		const remainingToSpent = property === "uses" && updatePath === "system.uses.spent";
		await item.update({ [updatePath]: remainingToSpent ? Math.max(0, max - newValue) : newValue });
	}
	// [CASE B] 일반 속성 업데이트
	else {
		if (path === "system.attributes.inspiration") {
			const current = Boolean(
				foundry.utils.getProperty(actor, "system.attributes.inspiration"),
			);
			const rawInput = String(input ?? "").trim().toLowerCase();
			let next = current;

			if (["1", "true", "on", "yes", "+"].includes(rawInput)) {
				next = true;
			} else if (["0", "false", "off", "no", "-"].includes(rawInput)) {
				next = false;
			} else if (rawInput.startsWith("+")) {
				next = true;
			} else if (rawInput.startsWith("-")) {
				next = false;
			} else if (rawInput === "") {
				next = !current;
			} else {
				const numeric = Number(rawInput);
				if (!Number.isNaN(numeric)) next = numeric > 0;
				else next = !current;
			}

			await actor.update({ "system.attributes.inspiration": next });
			return;
		}

		// HP 데미지 처리: Temp HP 우선 차감
		// 조건: 속성이 HP이고, 입력값이 마이너스(-)로 시작할 때
		if (
			path === "system.attributes.hp" &&
			input.toString().trim().startsWith("-")
		) {
			const damage = Math.abs(Number(input));
			const hp = actor.system.attributes.hp.value;
			const temp = actor.system.attributes.hp.temp || 0;

			// Temp HP가 있을 때만 특수 로직 수행
			if (temp > 0) {
				if (damage <= temp) {
					// 1. Temp HP가 데미지보다 많거나 같음 -> Temp만 깎임
					await actor.update({ "system.attributes.hp.temp": temp - damage });
				} else {
					// 2. Temp HP가 부족함 -> Temp는 0이 되고, 나머지는 본체 HP에서 차감
					const overflow = damage - temp;
					await actor.update({
						"system.attributes.hp.temp": 0,
						"system.attributes.hp.value": Math.max(0, hp - overflow),
					});
				}
				return; // 로직 종료 (아래 기본 로직 실행 안 함)
			}
		}

		// --- 기존 기본 로직 (힐링, AC 변경 등) ---
		const current =
			foundry.utils.getProperty(actor, `${path}.value`) ??
			foundry.utils.getProperty(actor, path) ??
			0;
		const max = foundry.utils.getProperty(actor, `${path}.max`) || 0;

		let newValue = current;
		if (input.startsWith("+") || input.startsWith("-")) {
			newValue += Number(input);
		} else {
			newValue = Number(input);
		}

		if (max > 0) newValue = Math.clamp(newValue, 0, max);
		else newValue = Math.max(0, newValue);

		let finalPath = path;
		if (foundry.utils.getProperty(actor, `${path}.value`) !== undefined) {
			finalPath = `${path}.value`;
		}

		await actor.update({ [finalPath]: newValue });
	}
}

/**
 * [헬퍼] 액션 타입 아이콘 생성 (스타일 제거 -> 클래스 부여)
 */
export function _getActivationIcon(activationType) {
	if (!activationType) return "";
	const type = String(activationType).toLowerCase();

	// 텍스트 매핑 (아이콘 대신 글자로 명확하게)
	let label = "";
	let classType = "";

	switch (type) {
		case "action":
			label = "A";
			classType = "action";
			break;
		case "bonus":
			label = "BA";
			classType = "bonus";
			break;
		case "reaction":
			label = "R";
			classType = "reaction";
			break;
		case "minute":
		case "hour":
		case "day":
			label = "T";
			classType = "time";
			break;
		case "legendary":
			label = "L";
			classType = "legendary";
			break;
		case "lair":
			label = "LA";
			classType = "lair";
			break;
		case "crew":
			label = "C";
			classType = "crew";
			break;
		case "special":
			label = "S";
			classType = "special";
			break;
		default:
			label = type.substring(0, 1).toUpperCase();
			classType = "default";
			break;
	}

	// ib-act-icon 클래스와 타입별 클래스(action, bonus...)를 부여
	return `<span class="ib-act-icon ${classType}" title="${type}">${label}</span>`;
}

/**
 * [헬퍼] D&D 5e 3.x/4.x 대응: 아이템의 Activity 또는 Legacy Data에서 활성화 정보 추출
 */
export function _getItemActivityData(item) {
	let activationType = "";
	let activationIcon = "";

	// 1. 신규 구조 (Activities) 확인
	// item.system.activities는 Collection(Map) 형태입니다.
	if (item.system.activities && item.system.activities.size > 0) {
		// 활동 중 'activation.type'이 있는 첫 번째 활동을 찾습니다.
		// (보통 공격이나 시전 활동이 가장 중요하므로)
		const activities = item.system.activities.contents || []; // Collection -> Array
		const mainActivity =
			activities.find((a) => a.activation?.type) || activities[0];

		if (mainActivity && mainActivity.activation) {
			activationType = mainActivity.activation.type;
		}
	}
	// 2. 구형 구조 (Legacy) 확인 (데이터 마이그레이션 전이거나, 단순 아이템)
	else if (item.system.activation) {
		activationType = item.system.activation.type;
	}

	// 아이콘 생성
	if (activationType) {
		activationIcon = this._getActivationIcon(activationType);
	}

	return { activationType, activationIcon };
}

/* -----------------------------------------
   AMMUNITION HELPERS (D&D 5e)
   ----------------------------------------- */

export function _getDnd5eCurrentAmmo(weapon) {
	const activities = weapon.system.activities?.contents || [];
	const attackActivity = activities.find(a => a.type === "attack") || activities[0];
	if (!attackActivity) return null;

	let ammoId = weapon.getFlag("dnd5e", `last.${attackActivity.id}.ammunition`);
	if (!ammoId) {
		const options = weapon.system.ammunitionOptions ?? [];
		ammoId = options[0]?.value;
	}
	if (!ammoId) return null;
	return weapon.actor?.items.get(ammoId) || null;
}

export function _formatRange(item) {
	if (item.labels?.range) return item.labels.range;

	const range = item.system?.range;
	if (!range?.units) return "";

	const u = range.units;
	if (u === "touch") return "Touch";
	if (u === "self") return "Self";
	if (u === "spec" || u === "any") return range.special || "Special";

	if (!range.value) return "";
	if (range.long) return `${range.value}/${range.long} ${u}`;
	return `${range.value} ${u}`;
}

export function _buildDnd5eAmmoHtml(weapon) {
	// [V14 Compatible Only]: In DnD5e v6+ (Foundry V14), weapon.system.properties is strictly a Set<string>
	const usesAmmo = weapon.system.properties instanceof Set && weapon.system.properties.has("amm");
	if (!usesAmmo) return "";

	const weaponId = weapon.id;
	const ammo = this._getDnd5eCurrentAmmo(weapon);

	if (!ammo) {
		return `
			<div style="display:flex; align-items:center; gap:3px; margin-top:2px;">
				<span style="
					background: rgba(80, 30, 30, 0.8);
					border: 1px solid #a44;
					border-radius: 3px;
					padding: 1px 6px;
					font-size: 0.8em;
					color: #fa0;
					line-height: 1.2;
				">⚠ No ammo</span>
				<button type="button"
					onclick="event.stopPropagation(); ActionHUD.useItem('ammo:${weaponId}:dropdown', event)"
					title="Select Ammo"
					style="background: rgba(40, 60, 40, 0.8); border: 1px solid #585; color: #ada; border-radius: 3px; padding: 1px 5px; font-size: 0.8em; cursor: pointer; line-height: 1.2;"
					onmouseover="this.style.background='#585'; this.style.color='#fff';"
					onmouseout="this.style.background='rgba(40, 60, 40, 0.8)'; this.style.color='#ada';">
					▼
				</button>
			</div>`;
	}

	const count = ammo.system.quantity ?? 0;
	const isLow = count <= 3 && count > 0;
	const isEmpty = count === 0;
	const badgeBg = isEmpty ? "rgba(80, 30, 30, 0.8)" : "rgba(40, 60, 40, 0.8)";
	const badgeBorder = isEmpty ? "#a44" : "#585";
	const countColor = isEmpty ? "#f66" : isLow ? "#fa0" : "#ada";
	const ammoImg = ammo.img ? `<img src="${ammo.img}" style="width:14px; height:14px; border:0; border-radius:2px; margin-right:3px; vertical-align:middle;" />` : "";

	return `
		<div style="display:flex; align-items:center; gap:3px; margin-top:2px;">
			<span style="
				display:inline-flex; align-items:center;
				background: ${badgeBg};
				border: 1px solid ${badgeBorder};
				border-radius: 3px;
				padding: 1px 6px;
				font-size: 0.8em;
				color: #ccc;
				line-height: 1.2;
				max-width: 130px;
				overflow: hidden;
			">
				${ammoImg}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80px;">${ammo.name}</span>
				<span style="font-family:'Teko',sans-serif; font-size:1.1em; color:${countColor}; margin-left:4px;">x${count}</span>
			</span>
			<button type="button"
				onclick="event.stopPropagation(); ActionHUD.useItem('ammo:${weaponId}:dropdown', event)"
				title="Select Ammo"
				style="background: rgba(40, 60, 40, 0.8); border: 1px solid #585; color: #ada; border-radius: 3px; padding: 1px 5px; font-size: 0.8em; cursor: pointer; line-height: 1.2;"
				onmouseover="this.style.background='#585'; this.style.color='#fff';"
				onmouseout="this.style.background='rgba(40, 60, 40, 0.8)'; this.style.color='#ada';">
				▼
			</button>
			<button type="button"
				onclick="event.stopPropagation(); ActionHUD.useItem('ammo:${weaponId}:minus', event)"
				title="Decrease Ammo"
				style="background: rgba(50, 50, 50, 0.8); border: 1px solid #666; color: #eee; border-radius: 3px; padding: 1px 5px; font-size: 0.8em; cursor: pointer; line-height: 1.2;"
				onmouseover="this.style.background='#eee'; this.style.color='#000';"
				onmouseout="this.style.background='rgba(50, 50, 50, 0.8)'; this.style.color='#eee';">
				−
			</button>
			<button type="button"
				onclick="event.stopPropagation(); ActionHUD.useItem('ammo:${weaponId}:plus', event)"
				title="Increase Ammo"
				style="background: rgba(50, 50, 50, 0.8); border: 1px solid #666; color: #eee; border-radius: 3px; padding: 1px 5px; font-size: 0.8em; cursor: pointer; line-height: 1.2;"
				onmouseover="this.style.background='#eee'; this.style.color='#000';"
				onmouseout="this.style.background='rgba(50, 50, 50, 0.8)'; this.style.color='#eee';">
				+
			</button>
		</div>`;
}

export async function _handleDnd5eAmmoAction(actor, weaponId, command, event) {
	const weapon = actor.items.get(weaponId);
	if (!weapon) return;

	if (command === "dropdown") {
		const ammoOptions = weapon.system.ammunitionOptions ?? [];

		let listHtml = "";
		if (ammoOptions.length === 0) {
			listHtml = `<div style="padding:8px; color:#999; font-size:0.9em; text-align:center;">No ammunition found</div>`;
		} else {
			const currentAmmo = this._getDnd5eCurrentAmmo(weapon);
			ammoOptions.forEach(opt => {
				const a = opt.item;
				const qty = a.system.quantity ?? 0;
				const ammoImg = a.img ? `<img src="${a.img}" style="width:18px; height:18px; border:0; border-radius:2px; margin-right:6px; vertical-align:middle;" />` : "";
				const isSelected = currentAmmo?.id === a.id;
				const selectedStyle = isSelected ? "border-left: 3px solid #5a5; padding-left: 5px;" : "padding-left: 8px;";
				const isDepleted = qty === 0;
				listHtml += `
					<div class="stylish-ammo-option" data-ammo-id="${a.id}" style="
						display:flex; align-items:center; padding:4px 8px; cursor:pointer;
						${selectedStyle}
						border-bottom: 1px solid rgba(255,255,255,0.05);
					"
					onmouseover="this.style.background='rgba(255,255,255,0.1)';"
					onmouseout="this.style.background='transparent';">
						${ammoImg}
						<span style="flex:1; color:${isDepleted ? '#666' : '#ddd'}; font-size:0.9em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.name}</span>
						<span style="font-family:'Teko',sans-serif; font-size:1.1em; color:${isDepleted ? '#666' : '#ada'}; margin-left:8px;">x${qty}</span>
					</div>`;
			});
		}

		const dropdown = document.createElement("div");
		dropdown.className = "stylish-ammo-dropdown";
		dropdown.style.cssText = `
			position: fixed; z-index: 99999;
			background: rgba(20, 20, 20, 0.95);
			border: 1px solid #585;
			border-radius: 4px;
			min-width: 180px;
			max-width: 300px;
			max-height: 300px;
			overflow-y: auto;
			box-shadow: 0 4px 12px rgba(0,0,0,0.6);
		`;
		dropdown.innerHTML = `
			<div style="padding:6px 8px; border-bottom:1px solid #585; color:#ada; font-size:0.85em; font-weight:bold;">
				Select Ammo
			</div>
			${listHtml}
		`;

		const clickX = event.clientX ?? 300;
		const clickY = event.clientY ?? 300;
		dropdown.style.left = `${clickX}px`;
		dropdown.style.top = `${clickY}px`;
		document.body.appendChild(dropdown);

		const rect = dropdown.getBoundingClientRect();
		if (rect.right > window.innerWidth) dropdown.style.left = `${window.innerWidth - rect.width - 8}px`;
		if (rect.bottom > window.innerHeight) dropdown.style.top = `${window.innerHeight - rect.height - 8}px`;

		dropdown.querySelectorAll(".stylish-ammo-option").forEach(optEl => {
			optEl.addEventListener("click", async (ev) => {
				ev.stopPropagation();
				const ammoId = optEl.dataset.ammoId;
				try {
					const activities = weapon.system.activities?.contents || [];
					const attackActivity = activities.find(a => a.type === "attack") || activities[0];
					if (attackActivity) {
						await weapon.setFlag("dnd5e", `last.${attackActivity.id}.ammunition`, ammoId);
					}
				} catch (err) {
					console.warn("StylishHUD | DnD5e ammo selection failed:", err);
				}
				dropdown.remove();
			});
		});

		const closeHandler = (ev) => {
			if (!dropdown.contains(ev.target)) {
				dropdown.remove();
				document.removeEventListener("pointerdown", closeHandler, true);
			}
		};
		setTimeout(() => document.addEventListener("pointerdown", closeHandler, true), 50);
		return;
	}

	if (command === "plus") {
		const ammo = this._getDnd5eCurrentAmmo(weapon);
		if (!ammo) return;
		await ammo.update({ "system.quantity": (ammo.system.quantity ?? 0) + 1 });
		return;
	}

	if (command === "minus") {
		const ammo = this._getDnd5eCurrentAmmo(weapon);
		if (!ammo) return;
		const newQty = Math.max((ammo.system.quantity ?? 0) - 1, 0);
		await ammo.update({ "system.quantity": newQty });
		return;
	}
}
