import { Logger } from 'homebridge';
import http from 'axios';
import { openSocket } from './events';
import { v4 as uuid } from 'uuid';

import { AbodeDevice } from '../devices/devices';

export let log: Logger;

const credentials = {
  email: '',
  password: '',
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
  session: '',
  apiKey: '',
  oauthToken: '',
};

const clearAuth = () => {
  auth.session = '';
  auth.apiKey = '';
  auth.oauthToken = '';
};

export const getAuthCookie = (): string => {
  return `SESSION=${auth.session};uuid=${DEVICE_UUID}`;
};

export const API_BASE_URL = 'https://my.goabode.com';
export const USER_AGENT_BASE = 'Homebridge';
export const ORIGIN = 'https://my.goabode.com/';

export let USER_AGENT = USER_AGENT_BASE;

export const api = http.create({
  baseURL: API_BASE_URL,
  headers: {
    'User-Agent': USER_AGENT,
  },
});

api.interceptors.request.use(
  (config) => {
    if (!config.url) {
      throw new Error('Missing URL.');
    }

    const isAuthPath = config.url.startsWith('/api/auth2/');
    const isSessionPath = config.url === '/api/v1/session';

    config.url = API_BASE_URL + config.url;

    config.headers = config.headers ?? {};

    config.headers['Cookie'] = getAuthCookie();

    if (isAuthPath) {
      return config;
    }

    config.headers['ABODE-API-KEY'] = auth.apiKey;

    if (!auth.session) {
      throw new Error('Missing session.');
    }
    if (!auth.apiKey) {
      throw new Error('Missing API key.');
    }

    if (isSessionPath) {
      return config;
    }

    if (!auth.oauthToken) {
      throw new Error('Missing OAuth token.');
    }

    config.headers['Authorization'] = `Bearer ${auth.oauthToken}`;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger

    // Abode will throw a 2191 error when it is unable to communicate with the gateway or camera. Not sure if this is
    // a rate limit from Abode's side or something else. However, it doesn't seem to be very harmful and just prevents
    // users from
    // Error code 2191 is "We are unable to communicate with your gateway/camera.  Please make sure it has an active internet
    // connection.If the problem persists, please reboot your gateway / camera or contact support for assistance."
    // It's safe to just gobble this one up and keep moving
    if (error.response.data.errorCode === 2191) {
      log.debug('Temporarily unable to communicate with your Abode gateway/camera. Error should clear itself.');
      log.debug('Failed request: ', error.response);
      log.debug(`return error code = ${error.response.status}`);
      return;
    }
    if (error.response.data.errorCode === 502) {
      log.info(`Caught a 502. Attempting to renew session: ${error}`);
      try {
        renewSession();
        return;
      } catch (_error) {
        log.error(`Failed to renew the session: ${error}`);
      }
    }
    log.error(`Caught an unhandled exception: ${error}.`);
    return Promise.reject(error);
  },
);

export const renewSession = async (): Promise<void> => {
  try {
    log.debug('Getting Abode session');

    const session = await getSession();
    if (session) {
      auth.session = session;
    }

    const oauthToken = await getOAuthToken();
    if (oauthToken) {
      auth.oauthToken = oauthToken;
    }
  } catch (error: any) {
    log.debug('No session, re-signing in', error);
    try {
      await performAuth();
    } catch (_error) {
      log.debug('Failed to renew session');
    }
  }
};

const performAuth = async (): Promise<void> => {
  try {
    if (!credentials.email || !credentials.password) {
      throw new Error('Missing credentials.');
    }

    clearAuth();

    log.info('Signing into Abode account');

    const authResponse = await api.post('/api/auth2/login', {
      id: credentials.email,
      password: credentials.password,
      uuid: DEVICE_UUID,
    });
    if (authResponse.status !== 200) {
      throw new Error('Received non-200 response.');
    }

    const apiKey = authResponse.data['token'];
    if (!apiKey) {
      throw new Error('Response did not contain API key.');
    }

    const cookieResponse = authResponse.headers['set-cookie'];
    const cookieDict = parseCookies((cookieResponse || []).join(';'));
    const session = cookieDict['SESSION'];
    if (!session) {
      throw new Error('Response did not contain session.');
    }

    auth.session = session;
    auth.apiKey = apiKey;

    const oauthToken = await getOAuthToken();
    auth.oauthToken = oauthToken;
    log.info('Successfully signed into Abode.');
  } catch (error: any) {
    log.error('Failed to performAuth:', error.message);
    throw new Error('Failed to sign into Abode account');
  }
};

const getOAuthToken = async (): Promise<string> => {
  const claimsResponse = await api.get('/api/auth2/claims');
  if (claimsResponse.status !== 200) {
    throw new Error('Received non-200 response.');
  }

  const oauthToken = claimsResponse.data['access_token'];
  if (!oauthToken) {
    throw new Error('Response did not contain OAuth token.');
  }

  return oauthToken;
};

const getSession = async (): Promise<string> => {
  const sessionResponse = await api.get('/api/v1/session');
  if (sessionResponse.status !== 200) {
    throw new Error('Received non-200 response.');
  }
  return sessionResponse.data.id;
};

export const getDevices = async (): Promise<AbodeDevice[]> => {
  log.debug('getDevices');
  const response = await api.get('/api/v1/devices');
  return response.data;
};

export const enum AbodeEventType {
  DeviceUpdate = 'com.goabode.device.update',
}

const parseCookies = (cookies: string | undefined): { [key: string]: string | undefined } => {
  if (!cookies) {
    return {};
  }

  return cookies
    .split(';')
    .map((v) => v.split('='))
    .reduce((acc: { [key: string]: string }, v) => {
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      return acc;
    }, {});
};
