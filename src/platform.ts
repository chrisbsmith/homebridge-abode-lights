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
// import { AbodeEvents, SOCKET_CONNECTED, SOCKET_DISCONNECTED } from './abode/events';

import {
  abodeInit,
  getDevices,
  AbodeSwitchStatusInt,
  AbodeDimmerStatusInt,
  AbodeSwitchDevice,
  AbodeSwitchStatus,
  AbodeDimmerDevice,
  isDeviceTypeDimmer,
} from './abode/api';

import { AbodeDevice } from './device';
import { PLATFORM_NAME, PLUGIN_NAME } from './constants';

import { AbodeDimmerAccessory } from './dimmerAccessory';

import { AbodeSwitchAccessory } from './switchAccessory';
import { AbodeBulbAccessory } from './bulbAccessory';

interface Config extends PlatformConfig {
  readonly email?: string;
  readonly password?: string;
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
      // await this.updateStatus();

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

  /**
 * This function is invoked when homebridge restores cached accessories from disk at startup.
 * It should be used to setup event handlers for characteristics and update respective values.
 */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    const service = accessory.getService(this.Service.AccessoryInformation);
    service!.removeCharacteristic(service!.getCharacteristic(this.Characteristic.FirmwareRevision));

    this.cachedAccessories.push(accessory);
    // this.accessories.push(accessory);
  }

  async discoverDevices() {
    try {
      const devices = await getDevices();

      // for each device
      //   is it a type we can add?
      //   does it already exist in homekit?

      for (const device of devices) {
        // We only support certain devices.
        switch (device.type_tag) {
          case "device_type.dimmer_meter":
          case "device_type.power_switch_sensor":
          case "device_type.light_bulb":
          case "device_type.hue":
            // start handling the device
            this.handleDevice(device)
            break;

          // Other device types that we don't support
          default:
            continue;
        }
      }
    } catch (error: any) {
      this.log.error('Failed to discoverDevices', error.message);
    }
  }

  async updateStatus(accessory: any) {
    try {
      const devices = await getDevices();
      const id = accessory.context.device.id;
      const device = devices.find((d) => d.id === id);

      if (!device) {
        this.log.warn('updateStatus did not find device', id);
        return;
      }

      switch (device.type_tag) {
        case "device_type.dimmer_meter": {
          const d = device as AbodeDimmerDevice;
          const service = accessory.getService(this.Service.Lightbulb);
          const currentState = this.convertAbodeDimmerStatusToDimmerCurrentState(d);
          const currentBrightness = d.statusEx
          service.getCharacteristic(this.Characteristic.On).updateValue(currentState);
          service.getCharacteristic(this.Characteristic.Brightness).updateValue(currentBrightness);
        }
          return;
        case "device_type.power_switch_sensor": {
          const d = device as AbodeSwitchDevice;
          const service = accessory.getService(this.Service.Switch);
          const currentState = this.convertAbodeSwitchStatusToSwitchCurrentState(d);
          service.getCharacteristic(this.Characteristic.On).updateValue(currentState)
        }
          return;
        case "device_type.light_bulb":
        case "device_type.hue":
          // start handling the device
          return;

        // Other device types that we don't support
        default:
          return;
      }
    } catch (error: any) {
      this.log.error('Failed to updateStatus', error.message);
    }
  }

  getUuid(device: any) {
    return this.api.hap.uuid.generate(device.id);
  }

  findCachedAccessory(device: any) {
    return this.cachedAccessories.find(accessory => accessory.UUID === this.getUuid(device));
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
    // Need to determine the type of device, and register it approprately

    this.log.debug("Hooking device of type ", device.type_tag)
    switch (device.type_tag) {
      // A Dimmer switch
      case "device_type.dimmer_meter":
        if (isDeviceTypeDimmer(device)) {
          new AbodeDimmerAccessory(this, accessory, device);
          this.accessories.push(accessory);
        }
        break;
      // A switch
      case "device_type.power_switch_sensor":
        new AbodeSwitchAccessory(this, accessory, device);
        this.accessories.push(accessory)
        break;
      // An Abode light bulb
      case "device_type.libht_bulb":
        this.log.debug('Found an Abode lightbulb');
        new AbodeBulbAccessory(this, accessory, device)
        this.accessories.push(accessory)
        break;
      //  Other wifi connected bulbs
      case "device_type.hue":
        this.log.debug('Found a wifi bulb');
        break;
      // Other device types
      default:
        break;
    }

  }

  handleDeviceUpdated(deviceId: string) {
    const accessory = this.accessories.find((a) => a.context.device.id === deviceId);
    if (accessory) {
      this.log.debug('Updating device ', accessory.context.device.name)
      this.updateStatus(accessory);
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

  getDimmerCurrentBrightness(device: AbodeDimmerDevice): CharacteristicValue {
    return device.statusEx;
  }

  convertDimmerTargetStateToAbodeDimmerStatusInt(value: CharacteristicValue): number {
    if (value) {
      return <number>value;
    } else {
      return AbodeDimmerStatusInt.Off;
    }
  }

  handleDevice(device: AbodeDevice) {

    // Deterine if the light is already registered
    let accessory = this.findCachedAccessory(device)
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
      this.log.debug('accessory device id = ', accessory.context.device.id)
    }

    this.log.debug("Hooking device to accessory", device.name);
    this.hookAccessory(accessory, device);
  }
}
