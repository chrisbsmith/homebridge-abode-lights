import {
  API,
  Characteristic,
  CharacteristicValue,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import { AbodeEvents, DEVICE_UPDATED, SOCKET_CONNECTED, SOCKET_DISCONNECTED } from './abode/events';
import {
  abodeInit,
  getDevices,
  AbodeSwitchStatusInt,
  AbodeDimmerStatusInt,
  isDeviceTypeSwitch,
  AbodeSwitchDevice,
  AbodeSwitchStatus,
  AbodeDimmerDevice,
  isDeviceTypeDimmer,
} from './abode/api';
import { PLATFORM_NAME, PLUGIN_NAME } from './constants';

import {
  AbodeSwitchAccessory,
  AbodeDimmerAccessory,
} from './accessory';

interface Config extends PlatformConfig {
  readonly email?: string;
  readonly password?: string;
}

export class AbodeLightsPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  private socketConnected = false;

  constructor(public readonly log: Logger, public readonly config: Config, public readonly api: API) {
    this.log.debug('Finished initializing AbodeLightsPlatform');

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');

      try {
        if (!config.email || !config.password) {
          throw new Error('Missing email and password');
        }

        await abodeInit({
          email: config.email,
          password: config.password,
          logger: log,
          homebridgeVersion: api.serverVersion,
        });
      } catch (error: any) {
        log.error('Failed to initialize:', error.message);
        return;
      }

      await this.discoverDevices();
      await this.updateStatus();

      AbodeEvents.on(SOCKET_CONNECTED, () => {
        this.socketConnected = true;
        log.debug('Socket connected');
      });
      AbodeEvents.on(SOCKET_DISCONNECTED, () => {
        this.socketConnected = false;
        log.debug('Socket disconnected');
        setTimeout(() => {
          if (!this.socketConnected) {
            this.log.error('Error establishing the socket with Abode.');
          }
        }, 30000);
      });
      AbodeEvents.on(DEVICE_UPDATED, this.handleDeviceUpdated.bind(this));
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  async discoverDevices() {
    try {
      const devices = await getDevices();

      for (const device of devices) {
        if (isDeviceTypeSwitch(device)) {

          const uuid = this.api.hap.uuid.generate(device.id);

          const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

          if (existingAccessory) {
            if (device) {
              this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

              existingAccessory.context.device = {
                id: device.id,
                name: device.name,
              };
              new AbodeSwitchAccessory(this, existingAccessory);

              this.api.updatePlatformAccessories([existingAccessory]);
            } else if (!device) {
              this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
              this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
            }
          } else {
            this.log.info('Adding new accessory:', device.name);

            const accessory = new this.api.platformAccessory(device.name, uuid);
            accessory.context.device = {
              id: device.id,
              name: device.name,
            };

            new AbodeSwitchAccessory(this, accessory);

            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            this.accessories.push(accessory);
          }
        } else if (isDeviceTypeDimmer(device)) {

          const uuid = this.api.hap.uuid.generate(device.id);

          const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

          if (existingAccessory) {
            if (device) {
              this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

              existingAccessory.context.device = {
                id: device.id,
                name: device.name,
              };
              new AbodeDimmerAccessory(this, existingAccessory);

              this.api.updatePlatformAccessories([existingAccessory]);
            } else if (!device) {
              this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
              this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
            }
          } else {
            this.log.info('Adding new accessory:', device.name);

            const accessory = new this.api.platformAccessory(device.name, uuid);
            accessory.context.device = {
              id: device.id,
              name: device.name,
            };

            new AbodeDimmerAccessory(this, accessory);

            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            this.accessories.push(accessory);
          }
        } else {
          continue;
        }
      }
    } catch (error: any) {
      this.log.error('Failed to discoverDevices', error.message);
    }
  }

  async updateStatus() {
    try {
      const devices = await getDevices();

      for (const accessory of this.accessories) {
        const id = accessory.context.device.id;
        const device = devices.find((d) => d.id === id);
        if (!device) {
          this.log.warn('updateStatus did not find device', id);
          continue;
        }

        if (isDeviceTypeSwitch(device)) {
          const service = accessory.getService(this.Service.Switch);
          if (!service) {
            this.log.info('updateStatus did not find switch service for device', id);
            continue;
          }

          const currentState = this.convertAbodeSwitchStatusToSwitchCurrentState(device);

          service.getCharacteristic(this.Characteristic.On).updateValue(currentState);
        } else if (isDeviceTypeDimmer(device)) {
          const service = accessory.getService(this.Service.Lightbulb);
          if (!service) {
            this.log.info('updateStatus did not find dimmer service for device', id);
            continue;
          }

          const currentState = this.convertAbodeDimmerStatusToDimmerCurrentState(device);
          const currentBrightness = device.statusEx;

          service.getCharacteristic(this.Characteristic.On).updateValue(currentState);
          service.getCharacteristic(this.Characteristic.Brightness).updateValue(currentBrightness);
        } else {
          this.log.info('updateStatus did not find device with switch type', id);
          continue;
        }
      }
    } catch (error: any) {
      this.log.error('Failed to updateStatus', error.message);
    }
  }

  handleDeviceUpdated(deviceId: string) {
    this.log.debug('handleDeviceUpdated', deviceId);

    const device = this.accessories.find((a) => a.context.device.id === deviceId);
    if (device) {
      this.updateStatus();
    }
  }

  convertAbodeSwitchStatusToSwitchCurrentState(device: AbodeSwitchDevice): CharacteristicValue {
    switch (device.status) {
      case AbodeSwitchStatus.On:
        return !!this.Characteristic.On;
      default:
        return !this.Characteristic.On;
    }
  }

  convertSwitchTargetStateToAbodeSwitchStatusInt(value: CharacteristicValue): AbodeSwitchStatusInt {
    if (value) {
      return AbodeSwitchStatusInt.On;
    } else {
      return AbodeSwitchStatusInt.Off;
    }
  }

  convertAbodeDimmerStatusToDimmerCurrentState(device: AbodeDimmerDevice): CharacteristicValue {
    switch (device.status) {
      case AbodeSwitchStatus.On:
        return !!this.Characteristic.On;
      default:
        return !this.Characteristic.On;
    }
  }

  convertDimmerTargetStateToAbodeDimmerStatusInt(value: CharacteristicValue): number {
    if (value) {
      return <number>value;
    } else {
      return AbodeDimmerStatusInt.Off;
    }
  }
}
