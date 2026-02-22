import { api, abodeInit } from './api';
import * as events from './events';
import MockAdapter from 'axios-mock-adapter';
import { Logger } from 'homebridge';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('API Reconnect Logic', () => {
  jest.useFakeTimers();

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

    // Mock the initial successful login flow
    mock.onPost('/api/auth2/login').reply(
      200,
      { token: 'initial-api-key' },
      { 'set-cookie': ['SESSION=initial-session'] } as any
    );
    mock.onGet('/api/auth2/claims').reply(200, { access_token: 'initial-oauth-token' });

    // Prevent openSocket from being called
    openSocketSpy = jest.spyOn(events, 'openSocket').mockImplementation(() => {});

    // Initialize the api, which starts the setInterval for renewSession
    await abodeInit({
      email: 'test@test.com',
      password: 'password',
      logger: mockLogger,
      homebridgeVersion: 'test',
    });
  });

  afterEach(() => {
    mock.restore();
    openSocketSpy.mockRestore();
    jest.clearAllTimers();
  });

  it('should attempt to re-authenticate if renewing the session fails', async () => {
    // 1. Mock the session renewal to fail
    mock.onGet('/api/v1/session').reply(401); // Unauthorized

    // 2. Mock a successful re-authentication
    mock.onPost('/api/auth2/login').reply(
        200,
        { token: 'new-api-key' },
        { 'set-cookie': ['SESSION=new-session'] } as any
      );
    mock.onGet('/api/auth2/claims').reply(200, { access_token: 'new-oauth-token' });

    // 3. Fast-forward time to trigger the setInterval in abodeInit
    await jest.advanceTimersByTimeAsync(1500001);

    // 4. Assert that the re-authentication logic was triggered
    expect(mockLogger.debug).toHaveBeenCalledWith('No session, re-signing in', expect.any(Error));
  });
});
