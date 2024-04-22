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
// import { convertKelvinMireds } from './utils/colorFunctions';

import { abodeInit } from './abode/api';

import { difference as _difference } from 'lodash';

import {
  AbodeDevice,
  AbodeDimmerDevice,
  AbodeSwitchDevice,
  AbodeLightBulbDevice,
  getLastUpdatedDevice,
} from './devices/devices';
import { PLATFORM_NAME, PLUGIN_NAME, POLLING_INTERVAL_MIN } from './constants';

import { AbodeDimmerAccessory } from './devices/dimmer/dimmerAccessory';

import { AbodeSwitchAccessory } from './devices/switch/switchAccessory';
import { AbodeBulbAccessory } from './devices/bulb/bulbAccessory';
import { getDevices, getDevice } from './utils/light.api';

interface Config extends PlatformConfig {
  readonly email?: string;
  readonly password?: string;
  readonly pollingInterval?: number;
}

export class AbodeLightsPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  public readonly cachedAccessories: PlatformAccessory[] = [];

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

      if (config.pollingInterval) {
        // Ensure interval is not shorter than minimum time.
        const interval = (config.pollingInterval <= POLLING_INTERVAL_MIN) ? POLLING_INTERVAL_MIN : config.pollingInterval;

        setInterval(() => {
          this.refreshDevices();
        }, interval * 60 * 1000);
      }
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.cachedAccessories.push(accessory);
  }

  // DiscoverDevices is used to request a full list of devices from Abode.
  async discoverDevices() {
    try {
      const devices = await getDevices();

      this.checkForRemovedAccessories(devices);

      for (const device of devices) {
        if (!this.isDeviceSupported(device)) {
          this.log.debug(`Not handling device: ${device.name}`);
          return;
        }
        // Deterine if the light is already registered
        let accessory = this.findCachedAccessory(device);
        if (accessory) {
          this.log.info('Restoring existing accessory from cache:', accessory.displayName);
          accessory.context.device = {
            id: device.id,
            name: device.name,
            version: device.version,
          };
        } else {
          this.log.info('Adding new accessory:', device.name);
          accessory = this.registerNewAccessory(device, device.name);
        }
        this.hookAccessory(accessory, device);
      }
    } catch (error: any) {
      this.log.error('Failed to discoverDevices', error.message);
    }
  }

  async updateStatus(accessory: any) {
    this.log.info('Updating status for device: ', accessory.context.device.name);
    try {
      const id = accessory.context.device.id;
      const device = await getDevice(id);

      if (!device) {
        this.log.warn('updateStatus did not find device', id);
        return;
      }

      switch (device.type_tag) {
        case 'device_type.dimmer_meter':
          {
            const d = device as AbodeDimmerDevice;
            const service = accessory.getService(this.Service.Lightbulb);
            const currentState = this.convertAbodeStateToPlatformState(d.statuses.switch);
            let currentBrightness = Number(d.statuses.level);
            if (currentBrightness > 100) {
              currentBrightness = 100;
            } else if (currentBrightness < 0) {
              currentBrightness = 0;
            }
            service.getCharacteristic(this.Characteristic.On).updateValue(currentState);
            service.getCharacteristic(this.Characteristic.Brightness).updateValue(currentBrightness);
          }
          return;
        case 'device_type.power_switch_sensor':
          {
            const d = device as AbodeSwitchDevice;
            const service = accessory.getService(this.Service.Switch);
            const currentState = this.convertAbodeStateToPlatformState(d.status);
            service.getCharacteristic(this.Characteristic.On).updateValue(currentState);
          }
          return;
        case 'device_type.light_bulb':
        case 'device_type.hue':
          {
            const d = device as AbodeLightBulbDevice;
            const service = accessory.getService(this.Service.Lightbulb);
            const currentState = this.convertAbodeStateToPlatformState(d.statuses.switch);

            service.getCharacteristic(this.Characteristic.On).updateValue(currentState);
            service.getCharacteristic(this.Characteristic.Hue).updateValue(d.statuses.hue);
            service.getCharacteristic(this.Characteristic.Saturation).updateValue(d.statuses.saturation);
            let currentBrightness = Number(d.statuses.level);
            if (currentBrightness > 100) {
              currentBrightness = 100;
            } else if (currentBrightness < 0) {
              currentBrightness = 0;
            }
            service.getCharacteristic(this.Characteristic.Brightness).updateValue(currentBrightness);

            let colorTemperature = Number(d.statuses.color_temp);
            if (colorTemperature < 154) {
              colorTemperature = 154;
            } else if (colorTemperature > 500) {
              colorTemperature = 500;
            }
            // service.getCharacteristic(this.Characteristic.ColorTemperature)
            //   .updateValue(Math.floor(convertKelvinMireds(d.statuses.color_temp)));
            service.getCharacteristic(this.Characteristic.ColorTemperature).updateValue(colorTemperature);

          }
          return;

        // Other device types that aren't supported
        default:
          return;
      }
    } catch (error: any) {
      this.log.error('Failed to updateStatus', error.message);
    }
  }

  // Check to see if this is a device that we currently support
  isDeviceSupported(device: AbodeDevice) {
    // We only support certain devices.
    try {
      switch (device.type_tag) {
        case 'device_type.dimmer_meter':
        case 'device_type.power_switch_sensor':
        case 'device_type.light_bulb':
        case 'device_type.hue':
          // start handling the device
          return true;
          break;

        // Other device types that we don't support
        default:
          return false;
      }
    } catch (error) {
      this.log.error(`isDeviceSupported: caught error: ${error}`);
      return false;
    }
  }

  getUuid(device: any) {
    return this.api.hap.uuid.generate(device.id);
  }

  findCachedAccessory(device: any) {
    return this.cachedAccessories.find((accessory) => accessory.UUID === this.getUuid(device));
  }

  returnCachedAccessoryUUIDs() {
    return this.cachedAccessories.map(accessory => accessory.UUID);
  }

  returnDeviceUUIDs(devices: any) {
    return devices.map(device => this.getUuid(device));
  }

  async checkForRemovedAccessories(devices: AbodeDevice[]) {
    const cachedAccessoryUUIDs = this.returnCachedAccessoryUUIDs();
    const deviceUUIDs = this.returnDeviceUUIDs(devices);
    const missingDevices = _difference(cachedAccessoryUUIDs, deviceUUIDs);

    this.log.info('Missing Devices to be removed from the platform: ', missingDevices);

    if (missingDevices.length > 0) {
      this.removeCachedAccessories(missingDevices);
    }
  }

  removeCachedAccessories(uuids: string[]) {
    for (const uuid of uuids) {
      const cachedAccessory = this.cachedAccessories.find((accessory) => accessory.UUID === uuid);
      if (!cachedAccessory) {
        this.log.warn('Unable to remove accessory with UUID: ', uuid);
        break;
      }
      this.log.warn('Removing unused accessory from cache:', cachedAccessory.displayName);
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [cachedAccessory]);

      delete this.cachedAccessories[cachedAccessory.UUID];
    }
  }


  registerNewAccessory(device: any, name: string) {
    const accessory = new this.api.platformAccessory(name, this.getUuid(device));
    accessory.context.device = {
      id: device.id,
      name: device.name,
    };

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    return accessory;
  }

  hookAccessory(accessory: any, device: any) {
    this.log.debug('Hooking device ', device.name, ' to the accessory.');
    switch (device.type_tag) {
      // A Dimmer switch
      case 'device_type.dimmer_meter':
        new AbodeDimmerAccessory(this, accessory, device);
        this.accessories.push(accessory);
        break;
      // A switch
      case 'device_type.power_switch_sensor':
        new AbodeSwitchAccessory(this, accessory, device);
        this.accessories.push(accessory);
        break;
      // A light bulb
      case 'device_type.light_bulb':
      case 'device_type.hue':
        new AbodeBulbAccessory(this, accessory, device);
        this.accessories.push(accessory);
        break;
      // Other device types
      default:
        break;
    }
  }

  // This is triggered by the Abode Event DEVICE_UPDATED, specifically when a device is
  // updated and Abode sends a websocket notifiation for the update.
  async handleDeviceUpdated(deviceId: string) {
    const accessory = this.accessories.find((a) => a.context.device.id === deviceId);

    // Abode will send an update event for actions taken against devices from HomeKit or
    // from another interface (Abode webpage or app), etc. To prevent reprocessing an update
    // for the device we just sent an update for, check to see if the updated device id
    // matches the one we just sent a request for. If so, just return.
    if (getLastUpdatedDevice() === deviceId) {
      this.log.debug(`Ignoring update for ${deviceId} because it was the last device we updated from HomeKit.`);
      return;
    }

    if (accessory) {
      this.log.debug(`Updating status for ${accessory.displayName}.`);
      await this.updateStatus(accessory);
    } else {
      this.log.debug(`Found a new device: ${deviceId}.`);
      await this.addDevice(deviceId);
    }
  }

  // Adds a new device if found after initialization
  async addDevice(deviceId: string) {
    const device = await getDevice(deviceId);

    // Check to see if we got an empty device back. If so, then don't try to process it.
    if (device.name === '') {
      this.log.debug('addDevice: an empty device was returned, so don\'t process it.');
      return;
    }

    this.log.debug(`addDevice: returned from getDevice with a device of : ${device.name}. Attempting to register it.`);

    if (!this.isDeviceSupported(device)) {
      this.log.debug(`addDevice: ${device.name} is not supported. Skipping.`);
      return;
    }

    this.log.info('Adding new accessory:', device.name);
    const accessory = this.registerNewAccessory(device, device.name);
    this.hookAccessory(accessory, device);
  }

  async refreshDevices() {
    this.log.debug('refreshDevices: requesting all devices from Abode.');
    const devices = await getDevices();
    this.log.debug(`refreshDevices: Abode returned ${devices.length} devices. Checking for removed devices.`);
    this.checkForRemovedAccessories(devices);
    this.log.debug('refreshDevices: finished refreshing devices.');
  }


  convertAbodeStateToPlatformState(state: string): CharacteristicValue {
    switch (state) {
      case '1':
      case 'On':
        return !!this.Characteristic.On;
      default:
        return !this.Characteristic.On;
    }
  }
}
