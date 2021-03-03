import { AbodeEventType, ORIGIN, USER_AGENT, getAuthCookie, renewSession } from "./api";

import { EventEmitter } from "events";
import WebSocket from "ws";
import { log } from "./api";

export const AbodeEvents = new EventEmitter();
export const DEVICE_UPDATED = "device_updated";
export const SOCKET_CONNECTED = "socket_connected";
export const SOCKET_DISCONNECTED = "socket_disconnected";

let pause = false;
const processEvent = (event: unknown) => {
	if (pause) return;
	if (!Array.isArray(event)) return;
	if (event[0] !== AbodeEventType.DeviceUpdate) return;

	const deviceId = event[1];
	if (!deviceId) return;

	pause = true;
	setTimeout(() => {
		pause = false;
	}, 500);

	AbodeEvents.emit(DEVICE_UPDATED, deviceId);
};

const WS_URL = "wss://my.goabode.com/socket.io/?EIO=3&transport=websocket";

let SOCKET_OPEN = false;

export const openSocket = (): void => {
	if (SOCKET_OPEN) return;

	const ws = new WebSocket(WS_URL, {
		headers: {
			Cookie: getAuthCookie(),
			Origin: ORIGIN,
			"User-Agent": USER_AGENT,
		},
	});

	let ping = setInterval(() => ws.send(2), 25000);

	ws.on("open", () => {
		SOCKET_OPEN = true;
		AbodeEvents.emit(SOCKET_CONNECTED);
	});

	ws.on("close", () => {
		SOCKET_OPEN = false;
		clearInterval(ping);
		AbodeEvents.emit(SOCKET_DISCONNECTED);
		reopenSocket();
	});

	ws.on("message", (data) => {
		try {
			const messageString = data.toString();

			if (messageString.includes(`"Not Authorized"`)) {
				ws.close();
				return;
			}

			if (!messageString.startsWith("0{")) {
				reopenWait = reopenWaitStart;
			}

			const messageJson = messageString.replace(/^[:\d]*/, "");
			if (!messageJson) return;
			const message = JSON.parse(messageJson);

			processEvent(message);
		} catch (error) {
			log.debug("Failed to parse message", error.message);
		}
	});

	ws.on("error", (error) => {
		log.debug("WebSocket error", error.message);
	});
};

const reopenWaitStart = 1000;
let reopenWait = reopenWaitStart;
const reopenSocket = () => {
	setTimeout(async () => {
		try {
			await renewSession();
			openSocket();
		} catch (error) {
			log.debug("Failed to reopenSocket", error.message);
		}
	}, reopenWait);
	reopenWait = reopenWait * 2;
};
