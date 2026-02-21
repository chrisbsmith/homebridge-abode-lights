import Bulb from './bulb'; // Static import
import { AbodeDeviceType, AbodeLightBulbDevice } from '../devices';
import { api, abodeInit } from '../../abode/api';
import * as events from '../../abode/events';
import MockAdapter from 'axios-mock-adapter';
import { Logger } from 'homebridge';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

jest.mock('../../utils/colorFunctions', () => ({
  convertKelvinMireds: (value: number) => 1000000 / value,
}));

jest.mock('./bulbInfo', () => ({
  AbodeBulb: {
    manufacturer: 'mock-abode',
    temperature_range: [1800, 6500], // Realistic Kelvin range
  },
}));


describe('Bulb', () => {
  jest.useFakeTimers();

  const mockDevice: AbodeLightBulbDevice = {
    id: 'test-bulb-id',
    type_tag: AbodeDeviceType.LightBulb,
    name: 'Test Bulb',
    version: '1',
    uuid: 'test-bulb-uuid',
    statuses: {
      saturation: 0,
      hue: 0,
      level: '0',
      switch: '0',
      color_temp: 200,
      color_mode: 0,
    },
    status: 'Off',
  };

  let bulb: Bulb; // Changed back to Bulb type
  let mock: MockAdapter;
  let openSocketSpy: jest.SpyInstance;
  let mockLogger: any;

  beforeEach(async () => {
    mock = new MockAdapter(api);
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as unknown as Logger;

    // Mock the login flow
    mock.onPost('/api/auth2/login').reply(
      200,
      { token: 'test-api-key' },
      { 'set-cookie': ['SESSION=test-session'] } as any,
    );
    mock.onGet('/api/auth2/claims').reply(200, { access_token: 'test-oauth-token' });

    // Prevent openSocket from being called
    openSocketSpy = jest.spyOn(events, 'openSocket').mockImplementation(() => { });

    // Initialize the api
    await abodeInit({
      email: 'test@test.com',
      password: 'password',
      logger: mockLogger,
      homebridgeVersion: 'test',
    });

    bulb = new Bulb(mockDevice); // Direct instantiation
  });

  afterEach(() => {
    mock.restore();
    openSocketSpy.mockRestore();
    jest.clearAllTimers();
    // Removed jest.dontMock
  });

  it('should initialize correctly', async () => {
    const callback = jest.fn();
    await bulb.Init(callback);
    expect(callback).toHaveBeenCalled();
    // Assertions reflect values after updateStates runs from mockDevice.statuses
    expect(bulb.getProductId()).toBe('test-bulb-id');
    expect(bulb.getProductUuid()).toBe('test-bulb-uuid');
    expect(bulb.getProductName()).toBe('Test Bulb');
    expect(bulb.getOn()).toBe('0'); // From mockDevice.statuses.switch
    expect(bulb.getBrightness()).toBe('0'); // From mockDevice.statuses.level
    expect(bulb.getHue()).toBe(0); // From mockDevice.statuses.hue
    expect(bulb.getSaturation()).toBe(0); // From mockDevice.statuses.saturation
    expect(bulb.getColorTemperature()).toBe(500);
  });

  it('should set the power state to on and off', async () => {
    mock.onPost('/integrations/v1/devices/test-bulb-uuid', { action: 'on' }).reply(200);
    mock.onPost('/integrations/v1/devices/test-bulb-uuid', { action: 'off' }).reply(200);

    await bulb.setOn(1);
    expect(bulb.getOn()).toBe(1);

    await bulb.setOn(0);
    expect(bulb.getOn()).toBe(0);
  });

  it('should set the brightness', async () => {
    mock.onPost('/integrations/v1/devices/test-bulb-uuid', { action: 'setpercent', percentage: 75 }).reply(200);

    await bulb.setBrightness(75);
    expect(bulb.getBrightness()).toBe(75);
  });

  it('should set hue and saturation', async () => {
    // Hue is set internally first, then saturation triggers the API call
    mock.onPost('/integrations/v1/devices/test-bulb-uuid', { action: 'setcolor', hue: 200, saturation: 50 }).reply(200);

    await bulb.setHue(200);
    expect(bulb.getHue()).toBe(200);

    await bulb.setSaturation(50);
    expect(bulb.getSaturation()).toBe(50);
    expect(bulb.getHue()).toBe(200); // Hue should remain as set
  });

  it('should set color temperature', async () => {
    // 4500 = 1e6/4500 ≈ 222 mireds; API and state use mireds
    mock.onPost('/integrations/v1/devices/test-bulb-uuid', { action: 'setcolortemperature', colorTemperature: 222 }).reply(200);

    await bulb.setColorTemperature(4500);
    expect(bulb.getColorTemperature()).toBe(222);
  });

  it('should handle API errors during brightness change', async () => {
    mock.onPost('/integrations/v1/devices/test-bulb-uuid', { action: 'setpercent', percentage: 60 }).reply(500);

    expect.assertions(1);
    try {
      await bulb.setBrightness(60);
    } catch (e: any) {
      expect(e.message).toBe('Request failed with status code 500');
    }
  });

  it('should never return NaN for color temperature when device reports invalid or missing color_temp', async () => {
    const deviceWithInvalidColorTemp: AbodeLightBulbDevice = {
      ...mockDevice,
      statuses: {
        ...mockDevice.statuses,
        color_temp: undefined as unknown as number,
      },
    };
    const bulbWithInvalidTemp = new Bulb(deviceWithInvalidColorTemp);
    const callback = jest.fn();
    await bulbWithInvalidTemp.Init(callback);

    const colorTemp = bulbWithInvalidTemp.getColorTemperature();
    expect(Number.isFinite(colorTemp)).toBe(true);
    expect(colorTemp).toBeGreaterThanOrEqual(153);
    expect(colorTemp).toBeLessThanOrEqual(500);
  });
});
