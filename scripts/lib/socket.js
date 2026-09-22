/* scripts/socket.js */
import * as errors from "./errors.js";

const RECIPIENT_TYPES = {
	ONE_GM: 0,
	ALL_GMS: 1,
	EVERYONE: 2,
};

const MESSAGE_TYPES = {
	COMMAND: 0,
	REQUEST: 1,
	RESPONSE: 2,
	RESULT: 3,
	EXCEPTION: 4,
	UNREGISTERED: 5,
};

export class ActionHUDSocket {
	constructor() {
		this.functions = new Map();
		this.socketName = "module.niks-action-hud";
		this.pendingRequests = new Map();

		// 소켓 리스너 등록
		game.socket.on(this.socketName, this._onSocketReceived.bind(this));

		// 유저 연결 상태 변경 시 Promise 정리 훅 등록
		Hooks.on("userConnected", this._handleUserActivity.bind(this));
	}

	/**
	 * 소켓으로 처리할 함수 등록
	 * @param {string} name - 호출할 때 사용할 식별자
	 * @param {Function} func - 실제 실행될 함수
	 */
	register(name, func) {
		if (!(func instanceof Function)) {
			console.error(
				`ActionHUDSocket | Cannot register non-function as socket handler for '${name}'.`,
			);
			return;
		}
		if (this.functions.has(name)) {
			console.warn(
				`ActionHUDSocket | Function '${name}' is already registered.`,
			);
			return;
		}
		this.functions.set(name, func);
	}

	async executeAsGM(handler, ...args) {
		const [name, func] = this._resolveFunction(handler);
		if (game.user.isGM) {
			return this._executeLocal(func, ...args);
		} else {
			if (!game.users.activeGM) {
				throw new errors.SocketlibNoGMConnectedError(
					`Could not execute handler '${name}' as GM, because no GM is connected.`,
				);
			}
			return this._sendRequest(name, args, RECIPIENT_TYPES.ONE_GM);
		}
	}

	async executeAsUser(handler, userId, ...args) {
		const [name, func] = this._resolveFunction(handler);
		if (userId === game.userId) return this._executeLocal(func, ...args);

		const user = game.users.get(userId);
		if (!user)
			throw new errors.SocketlibInvalidUserError(
				`No user with id '${userId}' exists.`,
			);
		if (!user.active)
			throw new errors.SocketlibInvalidUserError(
				`User '${user.name}' (${userId}) is not connected.`,
			);

		return this._sendRequest(name, args, [userId]);
	}

	async executeForAllGMs(handler, ...args) {
		const [name, func] = this._resolveFunction(handler);
		this._sendCommand(name, args, RECIPIENT_TYPES.ALL_GMS);
		if (game.user.isGM) {
			try {
				this._executeLocal(func, ...args);
			} catch (e) {
				console.error(e);
			}
		}
	}

	async executeForOtherGMs(handler, ...args) {
		const [name, func] = this._resolveFunction(handler);
		this._sendCommand(name, args, RECIPIENT_TYPES.ALL_GMS);
	}

	async executeForEveryone(handler, ...args) {
		const [name, func] = this._resolveFunction(handler);
		this._sendCommand(name, args, RECIPIENT_TYPES.EVERYONE);
		try {
			this._executeLocal(func, ...args);
		} catch (e) {
			console.error(e);
		}
	}

	async executeForOthers(handler, ...args) {
		const [name, func] = this._resolveFunction(handler);
		this._sendCommand(name, args, RECIPIENT_TYPES.EVERYONE);
	}

	async executeForUsers(handler, recipients, ...args) {
		if (!(recipients instanceof Array))
			throw new TypeError("Recipients parameter must be an array of user ids.");
		const [name, func] = this._resolveFunction(handler);
		const currentUserIndex = recipients.indexOf(game.userId);
		if (currentUserIndex >= 0) recipients.splice(currentUserIndex, 1);

		this._sendCommand(name, args, recipients);

		if (currentUserIndex >= 0) {
			try {
				this._executeLocal(func, ...args);
			} catch (e) {
				console.error(e);
			}
		}
	}

	/* --- Internal Methods --- */

	_sendRequest(handlerName, args, recipient) {
		const message = {
			handlerName,
			args,
			recipient,
			id: foundry.utils.randomID(),
			type: MESSAGE_TYPES.REQUEST,
		};
		const promise = new Promise((resolve, reject) =>
			this.pendingRequests.set(message.id, {
				handlerName,
				resolve,
				reject,
				recipient,
			}),
		);
		game.socket.emit(this.socketName, message);
		return promise;
	}

	_sendCommand(handlerName, args, recipient) {
		const message = {
			handlerName,
			args,
			recipient,
			type: MESSAGE_TYPES.COMMAND,
		};
		game.socket.emit(this.socketName, message);
	}

	_sendResult(id, result) {
		game.socket.emit(this.socketName, {
			id,
			result,
			type: MESSAGE_TYPES.RESULT,
		});
	}

	_sendError(id, type) {
		game.socket.emit(this.socketName, { id, type, userId: game.userId });
	}

	_executeLocal(func, ...args) {
		return func.call({ socketdata: { userId: game.userId } }, ...args);
	}

	_resolveFunction(func) {
		if (func instanceof Function) {
			const entry = Array.from(this.functions.entries()).find(
				([key, val]) => val === func,
			);
			if (!entry)
				throw new errors.SocketlibUnregisteredHandlerError(
					`Function '${func.name}' has not been registered.`,
				);
			return [entry[0], func];
		} else {
			const fn = this.functions.get(func);
			if (!fn)
				throw new errors.SocketlibUnregisteredHandlerError(
					`No socket handler with the name '${func}' has been registered.`,
				);
			return [func, fn];
		}
	}

	_onSocketReceived(message, senderId) {
		if (
			message.type === MESSAGE_TYPES.COMMAND ||
			message.type === MESSAGE_TYPES.REQUEST
		)
			this._handleRequest(message, senderId);
		else this._handleResponse(message, senderId);
	}

	async _handleRequest(message, senderId) {
		const { handlerName, args, recipient, id, type } = message;

		// 수신자 확인 logic
		if (recipient instanceof Array) {
			if (!recipient.includes(game.userId)) return;
		} else {
			switch (recipient) {
				case RECIPIENT_TYPES.ONE_GM:
					if (!game.users.activeGM?.isSelf) return;
					break;
				case RECIPIENT_TYPES.ALL_GMS:
					if (!game.user.isGM) return;
					break;
				case RECIPIENT_TYPES.EVERYONE:
					break;
				default:
					return;
			}
		}

		let name, func;
		try {
			[name, func] = this._resolveFunction(handlerName);
		} catch (e) {
			if (
				e instanceof errors.SocketlibUnregisteredHandlerError &&
				type === MESSAGE_TYPES.REQUEST
			) {
				this._sendError(id, MESSAGE_TYPES.UNREGISTERED);
			}
			throw e;
		}

		const context = { socketdata: { userId: senderId } };
		if (type === MESSAGE_TYPES.COMMAND) {
			func.call(context, ...args);
		} else {
			let result;
			try {
				result = await func.call(context, ...args);
			} catch (e) {
				console.error(`ActionHUDSocket | Exception in '${name}':`, e);
				this._sendError(id, MESSAGE_TYPES.EXCEPTION);
				throw e;
			}
			this._sendResult(id, result);
		}
	}

	_handleResponse(message, senderId) {
		const { id, result, type } = message;
		const request = this.pendingRequests.get(id);
		if (!request) return;

		if (!this._isResponseSenderValid(senderId, request.recipient)) return;

		switch (type) {
			case MESSAGE_TYPES.RESULT:
				request.resolve(result);
				break;
			case MESSAGE_TYPES.EXCEPTION:
				request.reject(
					new errors.SocketlibRemoteException(
						`Remote exception in '${request.handlerName}'. See sender's console.`,
					),
				);
				break;
			case MESSAGE_TYPES.UNREGISTERED:
				request.reject(
					new errors.SocketlibUnregisteredHandlerError(
						`Handler '${request.handlerName}' unregistered on target client.`,
					),
				);
				break;
			default:
				request.reject(
					new errors.SocketlibInternalError(`Unknown result type '${type}'.`),
				);
				break;
		}
		this.pendingRequests.delete(id);
	}

	_isResponseSenderValid(senderId, recipients) {
		if (recipients === RECIPIENT_TYPES.ONE_GM && game.users.get(senderId).isGM)
			return true;
		if (recipients instanceof Array && recipients.includes(senderId))
			return true;
		return false;
	}

	_handleUserActivity(user, active) {
		if (!active) {
			// 연결 끊긴 유저가 포함된 대기 중인 요청들 reject 처리
			for (const [id, request] of this.pendingRequests.entries()) {
				const { recipient, handlerName } = request;
				if (recipient === RECIPIENT_TYPES.ONE_GM && !game.users.activeGM) {
					request.reject(
						new errors.SocketlibNoGMConnectedError(
							`All GMs disconnected during '${handlerName}'.`,
						),
					);
					this.pendingRequests.delete(id);
				} else if (recipient instanceof Array && recipient.includes(user.id)) {
					request.reject(
						new errors.SocketlibInvalidUserError(
							`User '${user.name}' disconnected during '${handlerName}'.`,
						),
					);
					this.pendingRequests.delete(id);
				}
			}
		}
	}
}
