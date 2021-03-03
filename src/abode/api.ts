import { Logger } from "homebridge";
import { default as http } from "axios";
import { openSocket } from "./events";
import { v4 as uuid } from "uuid";

export let log: Logger;

const credentials = {
	email: "",
	password: "",
};

export interface AbodeInit {
	readonly email: string;
	readonly password: string;
	readonly logger: Logger;
	readonly homebridgeVersion: string;
}

export const abodeInit = async (data: AbodeInit) => {
	credentials.email = data.email;
	credentials.password = data.password;
	log = data.logger;
	if (data.homebridgeVersion) {
		USER_AGENT = `${USER_AGENT_BASE}/${data.homebridgeVersion}`;
	}

	await performAuth();
	openSocket();

	setInterval(renewSession, 1500000);
};

const DEVICE_UUID = uuid();

const auth = {
	session: "",
	apiKey: "",
	oauthToken: "",
};

const clearAuth = () => {
	auth.session = "";
	auth.apiKey = "";
	auth.oauthToken = "";
};

export const getAuthCookie = (): string => {
	return `SESSION=${auth.session};uuid=${DEVICE_UUID}`;
};

export const API_BASE_URL = "https://my.goabode.com";
export const USER_AGENT_BASE = "Homebridge";
export const ORIGIN = "https://my.goabode.com/";

export let USER_AGENT = USER_AGENT_BASE;

http.interceptors.request.use(
	(config) => {
		if (!config.url) throw new Error("Missing URL.");

		const isAuthPath = config.url.startsWith("/api/auth2/");
		const isSessionPath = config.url === "/api/v1/session";
		config.url = API_BASE_URL + config.url;

		config.headers["User-Agent"] = USER_AGENT;
		config.headers["Cookie"] = getAuthCookie();

		if (isAuthPath) return config;

		config.headers["ABODE-API-KEY"] = auth.apiKey;

		if (!auth.session) {
			throw new Error("Missing session.");
		}
		if (!auth.apiKey) {
			throw new Error("Missing API key.");
		}

		if (isSessionPath) return config;

		if (!auth.oauthToken) {
			throw new Error("Missing OAuth token.");
		}

		config.headers["Authorization"] = `Bearer ${auth.oauthToken}`;

		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

export const renewSession = async (): Promise<void> => {
	try {
		log.debug("Getting Abode session");

		const session = await getSession();
		if (session) auth.session = session;

		const oauthToken = await getOAuthToken();
		if (oauthToken) auth.oauthToken = oauthToken;
	} catch (error) {
		log.debug("No session, re-signing in", error);
		try {
			await performAuth();
		} catch (_error) {
			log.debug("Failed to renew session");
		}
	}
};

const performAuth = async (): Promise<void> => {
	try {
		if (!credentials.email || !credentials.password) {
			throw new Error("Missing credentials.");
		}

		clearAuth();

		log.info("Signing into Abode account");

		const authResponse = await http.post("/api/auth2/login", {
			id: credentials.email,
			password: credentials.password,
			uuid: DEVICE_UUID,
		});
		if (authResponse.status !== 200) {
			throw new Error("Received non-200 response.");
		}

		const apiKey = authResponse.data["token"];
		if (!apiKey) {
			throw new Error("Response did not contain API key.");
		}

		const cookieResponse = authResponse.headers["set-cookie"];
		const cookieDict = parseCookies((cookieResponse || []).join(";"));
		const session = cookieDict["SESSION"];
		if (!session) {
			throw new Error("Response did not contain session.");
		}

		auth.session = session;
		auth.apiKey = apiKey;

		const oauthToken = await getOAuthToken();
		auth.oauthToken = oauthToken;
	} catch (error) {
		log.error("Failed to performAuth:", error.message);
		throw new Error("Failed to sign into Abode account");
	}
};

const getOAuthToken = async (): Promise<string> => {
	const claimsResponse = await http.get("/api/auth2/claims");
	if (claimsResponse.status !== 200) {
		throw new Error("Received non-200 response.");
	}

	const oauthToken = claimsResponse.data["access_token"];
	if (!oauthToken) {
		throw new Error("Response did not contain OAuth token.");
	}

	return oauthToken;
};

const getSession = async (): Promise<string> => {
	const sessionResponse = await http.get("/api/v1/session");
	if (sessionResponse.status !== 200) {
		throw new Error("Received non-200 response.");
	}
	return sessionResponse.data.id;
};

export const enum AbodeDeviceType {
	Switch = "device_type.power_switch_sensor",
	Dimmer = "device_type.dimmer_meter",
}

export interface AbodeDevice {
	readonly id: string;
	readonly type_tag: AbodeDeviceType;
	readonly name: string;
}

export const enum AbodeSwitchStatus {
	On = "On",
	Off = "Off",
}

export const enum AbodeSwitchStatusInt {
	On = 1,
	Off = 0,
}

export const enum AbodeDimmerStatus {
	On = "On",
	Off = "Off",
}

export const enum AbodeDimmerStatusInt {
	On = 1,
	Off = 0,
}

export interface AbodeSwitchDevice extends AbodeDevice {
	readonly type_tag: AbodeDeviceType.Switch;
	readonly status: AbodeSwitchStatus;
}

export interface AbodeDimmerDevice extends AbodeDevice {
	readonly type_type: AbodeDeviceType.Dimmer;
	readonly status: AbodeSwitchStatus;
	readonly statusEx: number;
}

export const getDevices = async (): Promise<AbodeDevice[]> => {
	log.debug("getDevices");
	const response = await http.get("/api/v1/devices");
	return response.data;
};

export interface AbodeControlSwitchResponse {
	readonly id: string;
	readonly status: AbodeSwitchStatusInt;
}

export interface AbodeControlDimmerResponse {
	readonly id: string;
	readonly status: AbodeDimmerStatusInt;
}
export interface AbodeControlDimmerBrightnessResponse {
	readonly id: string
	readonly level: number
}

export const controlSwitch = async (id: string, status: AbodeSwitchStatusInt): Promise<AbodeControlSwitchResponse> => {
	const response = await http.put(`/api/v1/control/power_switch/${id}`, { status });
	return response.data;
};

export const controlDimmer = async (id: string, status: AbodeDimmerStatusInt): Promise<AbodeControlDimmerResponse> => {
	const response = await http.put(`/api/v1/control/light/${id}`, { status });
	return response.data;
};

export const controlDimmerBrightness = async (id: string, level: number): Promise<AbodeControlDimmerBrightnessResponse> => {
	const response = await http.put(`/api/v1/control/light/${id}`, { level });
	return response.data;
};

export const isDeviceTypeSwitch = (device: AbodeDevice): device is AbodeSwitchDevice => {
	return device.type_tag === AbodeDeviceType.Switch;
};

export const isDeviceTypeDimmer = (device: AbodeDevice): device is AbodeDimmerDevice => {
	return device.type_tag === AbodeDeviceType.Dimmer;
}

export const enum AbodeEventType {
	DeviceUpdate = "com.goabode.device.update",
}

const parseCookies = (cookies: string | undefined): { [key: string]: string | undefined } => {
	if (!cookies) return {};

	return cookies
		.split(";")
		.map((v) => v.split("="))
		.reduce((acc: { [key: string]: string }, v) => {
			acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
			return acc;
		}, {});
};
