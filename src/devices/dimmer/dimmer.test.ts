import Dimmer from './dimmer';
import { AbodeDeviceType, AbodeDimmerDevice, AbodeDimmerStatus } from '../devices';
import { api, abodeInit } from '../../abode/api';
import * as events from '../../abode/events';
import MockAdapter from 'axios-mock-adapter';
import { Logger } from 'homebridge';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('Dimmer', () => {
  jest.useFakeTimers();

  const mockDevice: AbodeDimmerDevice = {
    id: 'test-dimmer-id',
    type_tag: AbodeDeviceType.Dimmer,
    name: 'Test Dimmer',
    version: '1',
    brightness: 0,
    uuid: 'test-dimmer-uuid',
    statuses: {
      switch: '0',
      level: '0',
    },
    status: AbodeDimmerStatus.Off,
  };

  let dimmer: Dimmer;
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

    dimmer = new Dimmer(mockDevice);
  });

  afterEach(() => {
    mock.restore();
    openSocketSpy.mockRestore();
  });

  it('should initialize correctly', async () => {
    const callback = jest.fn();
    await dimmer.Init(callback);
    expect(callback).toHaveBeenCalled();
    expect(dimmer.getOn()).toBe('0');
  });

  it('should set the dimmer brightness to 100', async () => {
    mock.onPut('/api/v1/control/light/test-dimmer-id', { level: 100 }).reply(200);

    await dimmer.setBrightness(100);
    expect(dimmer.getBrightness()).toBe(100);
  });

  it('should set the power state to on and off', async () => {
    mock.onPut('/api/v1/control/light/test-dimmer-id', { status: 1 }).reply(200);
    mock.onPut('/api/v1/control/light/test-dimmer-id', { status: 0 }).reply(200);

    // Turn it on first
    await dimmer.setOn(1);
    expect(dimmer.getOn()).toBe(1);

    // Then turn it off
    await dimmer.setOn(0);
    expect(dimmer.getOn()).toBe(0);
  });

  it('should throw an error when the api returns a 500', async () => {
    mock.onPut('/api/v1/control/light/test-dimmer-id', { level: 50 }).reply(500);

    expect.assertions(1);
    try {
      await dimmer.setBrightness(50);
    } catch (e: any) {
      expect(e.message).toBe('Request failed with status code 500');
    }
  });
});
