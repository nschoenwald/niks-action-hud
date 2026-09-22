
const SNAP_THRESHOLD = 15;

export const getSnapTargets = () => {
	const targets = {
		vertical: [],
		horizontal: [],
	};

	const winW = window.innerWidth;
	const winH = window.innerHeight;

	targets.vertical.push({ pos: 0, label: "screen-left" });
	targets.vertical.push({ pos: winW, label: "screen-right" });
	targets.horizontal.push({ pos: 0, label: "screen-top" });
	targets.horizontal.push({ pos: winH, label: "screen-bottom" });

	const sidebar = document.getElementById("sidebar");
	if (sidebar) {
		const rect = sidebar.getBoundingClientRect();
		targets.vertical.push({ pos: rect.left, label: "sidebar-left" });
		targets.vertical.push({ pos: rect.right, label: "sidebar-right" });
	}

	const uiLeft = document.getElementById("ui-left");
	if (uiLeft) {
		const rect = uiLeft.getBoundingClientRect();
		targets.vertical.push({ pos: rect.left, label: "ui-left-left" });
		targets.vertical.push({ pos: rect.right, label: "ui-left-right" });
	}

	const navigation = document.getElementById("navigation");
	if (navigation) {
		const rect = navigation.getBoundingClientRect();
		targets.horizontal.push({ pos: rect.bottom, label: "nav-bottom" });
	}

	const players = document.getElementById("players");
	if (players) {
		const rect = players.getBoundingClientRect();
		targets.horizontal.push({ pos: rect.top, label: "players-top" });
	}

	const hotbar = document.getElementById("hotbar");
	if (hotbar) {
		const rect = hotbar.getBoundingClientRect();
		targets.horizontal.push({ pos: rect.top, label: "hotbar-top" });
	}

	return targets;
};

export const findSnap = (value, targets, threshold = SNAP_THRESHOLD) => {
	let closest = null;
	let minDist = threshold;

	for (const target of targets) {
		const dist = Math.abs(value - target.pos);
		if (dist < minDist) {
			minDist = dist;
			closest = target;
		}
	}

	return closest;
};

export const applySnap = (rect, targets, threshold = SNAP_THRESHOLD) => {
	const result = {
		left: rect.left,
		top: rect.top,
		snappedX: null,
		snappedY: null,
	};

	const leftSnap = findSnap(rect.left, targets.vertical, threshold);
	const rightSnap = findSnap(rect.right, targets.vertical, threshold);

	if (leftSnap && (!rightSnap || Math.abs(rect.left - leftSnap.pos) <= Math.abs(rect.right - rightSnap.pos))) {
		result.left = leftSnap.pos;
		result.snappedX = leftSnap;
	} else if (rightSnap) {
		result.left = rightSnap.pos - rect.width;
		result.snappedX = rightSnap;
	}

	const topSnap = findSnap(rect.top, targets.horizontal, threshold);
	const bottomSnap = findSnap(rect.bottom, targets.horizontal, threshold);

	if (topSnap && (!bottomSnap || Math.abs(rect.top - topSnap.pos) <= Math.abs(rect.bottom - bottomSnap.pos))) {
		result.top = topSnap.pos;
		result.snappedY = topSnap;
	} else if (bottomSnap) {
		result.top = bottomSnap.pos - rect.height;
		result.snappedY = bottomSnap;
	}

	return result;
};

export const showSnapGuide = (snappedX, snappedY) => {
	removeSnapGuide();

	if (snappedX) {
		const line = document.createElement("div");
		line.className = "ib-snap-guide ib-snap-guide-v";
		line.style.cssText = `
			position: fixed;
			left: ${snappedX.pos}px;
			top: 0;
			width: 2px;
			height: 100vh;
			background: #4ecdc4;
			pointer-events: none;
			z-index: 999999;
			opacity: 0.8;
		`;
		document.body.appendChild(line);
	}

	if (snappedY) {
		const line = document.createElement("div");
		line.className = "ib-snap-guide ib-snap-guide-h";
		line.style.cssText = `
			position: fixed;
			left: 0;
			top: ${snappedY.pos}px;
			width: 100vw;
			height: 2px;
			background: #4ecdc4;
			pointer-events: none;
			z-index: 999999;
			opacity: 0.8;
		`;
		document.body.appendChild(line);
	}
};

export const removeSnapGuide = () => {
	document.querySelectorAll(".ib-snap-guide").forEach((el) => {
		el.remove();
	});
};
