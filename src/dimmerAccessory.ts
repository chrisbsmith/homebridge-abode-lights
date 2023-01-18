import {
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { AbodeLightsPlatform } from './platform';
import {
  AbodeDimmerDevice,
} from './abode/api';
import Dimmer from './dimmer';

export class AbodeDimmerAccessory {
  public service: Service;
  private dimmer;

  constructor(private readonly platform: AbodeLightsPlatform, public readonly accessory: PlatformAccessory, private readonly light: AbodeDimmerDevice) {

    this.dimmer = new Dimmer(this.light);

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'abode')
      .setCharacteristic(this.platform.Characteristic.Model, 'Dimmer')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id)
      .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, 'com.abode.abode');

    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, this.setDimmerState.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .on(CharacteristicEventTypes.SET, this.setDimmerBrightness.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.FirmwareRevision)
      .onGet(this.handleFirmwareRevisionGet.bind(this));

    this.dimmer.Init(light.status, light.statusEx, light.name);
  }

  async setDimmerState(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('setDimmerState', this.dimmer.getId(), value);

    try {
      const status = this.platform.convertDimmerTargetStateToAbodeDimmerStatusInt(value);
      await this.dimmer.setOn(status)
      callback();
    } catch (error: any) {
      this.platform.log.error('setSwitchState failed', error.message);
      callback(error);
    }
  }

  async setDimmerBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('setDimmerBrightness', this.dimmer.getId(), value);

    try {
      // const status = this.platform.convertDimmerTargetStateToAbodeDimmerStatusInt(value);
      // this.platform.log.debug('brightness from dimmer: ', value)
      // this.platform.log.debug('brightness from function: ', status)
      await this.dimmer.setBrightness(value)
      callback();
    } catch (error: any) {
      this.platform.log.error('setDimmerBrightness failed', error.message);
      callback(error);
    }
  }

  /**
 * Handle requests to get the current value of the "Firmware Revision" characteristic
 */
  handleFirmwareRevisionGet() {
    this.platform.log.debug('Triggered GET FirmwareRevision');

    // set this to a valid value for FirmwareRevision
    const currentValue = this.dimmer.getVersion();

    return currentValue;
  }
}
