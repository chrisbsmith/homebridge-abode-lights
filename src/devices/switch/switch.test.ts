import Switch from './switch';
import { AbodeDeviceType, AbodeSwitchDevice, AbodeSwitchStatus } from '../devices';
import { api, abodeInit } from '../../abode/api';
import * as events from '../../abode/events';
import MockAdapter from 'axios-mock-adapter';
import { Logger } from 'homebridge';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('Switch', () => {
  jest.useFakeTimers();

  const mockDevice: AbodeSwitchDevice = {
    id: 'test-switch-id',
    type_tag: AbodeDeviceType.Switch,
    name: 'Test Switch',
    version: '1',
    uuid: 'test-switch-uuid',
    statuses: {
      switch: '0',
    },
    status: AbodeSwitchStatus.Off,
  };

  let lightSwitch: Switch;
  let mock: MockAdapter;
  let openSocketSpy: jest.SpyInstance;

  beforeEach(async () => {
    mock = new MockAdapter(api);
    const mockLogger = {
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
    openSocketSpy = jest.spyOn(events, 'openSocket').mockImplementation(() => {});

    // Initialize the api
    await abodeInit({
      email: 'test@test.com',
      password: 'password',
      logger: mockLogger,
      homebridgeVersion: 'test',
    });

    lightSwitch = new Switch(mockDevice);
  });

  afterEach(() => {
    mock.restore();
    openSocketSpy.mockRestore();
  });

  it('should initialize correctly', async () => {
    const callback = jest.fn();
    await lightSwitch.Init(callback);
    expect(callback).toHaveBeenCalled();
    expect(lightSwitch.getOn()).toBe('0');
  });

  it('should set the power state to on', async () => {
    mock.onPut('/api/v1/control/power_switch/test-switch-id', { status: 1 }).reply(200);

    await lightSwitch.setOn(1);
    expect(lightSwitch.getOn()).toBe(1);
  });

  it('should set the power state to off', async () => {
    mock.onPut('/api/v1/control/power_switch/test-switch-id', { status: 1 }).reply(200);
    mock.onPut('/api/v1/control/power_switch/test-switch-id', { status: 0 }).reply(200);

    // Turn it on first
    await lightSwitch.setOn(1);
    expect(lightSwitch.getOn()).toBe(1);

    // Then turn it off
    await lightSwitch.setOn(0);
    expect(lightSwitch.getOn()).toBe(0);
  });
});
