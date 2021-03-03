import { API } from "homebridge";
import { AbodeLightsPlatform } from "./platform";
import { PLATFORM_NAME } from "./constants";

export = (api: API) => {
	api.registerPlatform(PLATFORM_NAME, AbodeLightsPlatform);
};
