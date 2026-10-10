import { MODULE_ID } from "../constants.js";

/**
 * Lightweight GM socket dispatcher for Nik's Action HUD.
 * Replaces external socket libraries with native Foundry socket events.
 */
class ActionHudSocket {
	constructor() {
		this._handlers = new Map();
		this._channel = `module.${MODULE_ID}`;
		this._pending = new Map();
		this._sequence = 0;

		Hooks.once("ready", () => {
			game.socket.on(this._channel, this._onSocketMessage.bind(this));
		});
	}

	register(action, handler) {
		this._handlers.set(action, handler);
	}

	async executeAsGM(action, ...args) {
		if (game.user.isGM) {
			const handler = this._handlers.get(action);
			if (!handler) throw new Error(`[${MODULE_ID}] No local GM handler registered for action "${action}"`);
			return handler(...args, game.user.id);
		}

		if (!game.users.activeGM) {
			console.warn(`[${MODULE_ID}] Cannot execute GM action "${action}": No active GM connected.`);
			return null;
		}

		const id = `req_${Date.now()}_${++this._sequence}`;
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this._pending.delete(id);
				reject(new Error(`[${MODULE_ID}] Socket request "${action}" timed out.`));
			}, 10000);

			this._pending.set(id, { resolve, reject, timeout });
			game.socket.emit(this._channel, {
				type: "request",
				id,
				action,
				args,
				userId: game.user.id,
			});
		});
	}

	async _onSocketMessage(data) {
		if (!data || typeof data !== "object") return;

		if (data.type === "request" && game.user.isGM) {
			const handler = this._handlers.get(data.action);
			let result = null;
			let error = null;

			if (handler) {
				try {
					result = await handler(...(data.args || []), data.userId);
				} catch (err) {
					error = err?.message || String(err);
				}
			} else {
				error = `Unrecognized action "${data.action}"`;
			}

			game.socket.emit(this._channel, {
				type: "response",
				id: data.id,
				targetUserId: data.userId,
				result,
				error,
			});
			return;
		}

		if (data.type === "response" && data.targetUserId === game.user.id) {
			const pending = this._pending.get(data.id);
			if (!pending) return;

			clearTimeout(pending.timeout);
			this._pending.delete(data.id);

			if (data.error) {
				pending.reject(new Error(data.error));
			} else {
				pending.resolve(data.result);
			}
		}
	}
}

export const socket = new ActionHudSocket();
