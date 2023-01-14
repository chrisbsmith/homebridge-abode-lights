import {
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { AbodeLightsPlatform } from './platform';
import {
  controlDimmer,
  controlDimmerBrightness,
} from './abode/api';

export class AbodeDimmerAccessory {
  public service: Service;

  constructor(private readonly platform: AbodeLightsPlatform, public readonly accessory: PlatformAccessory) {
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
  }

  async setDimmerState(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('setDimmerState', this.accessory.context.device.id, value);

    try {
      const status = this.platform.convertDimmerTargetStateToAbodeDimmerStatusInt(value);
      await controlDimmer(this.accessory.context.device.id, status);
      callback();
    } catch (error: any) {
      this.platform.log.error('setSwitchState failed', error.message);
      callback(error);
    }
  }

  async setDimmerBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('setDimmerBrightness', this.accessory.context.device.id, value);

    try {
      const status = this.platform.convertDimmerTargetStateToAbodeDimmerStatusInt(value);
      await controlDimmerBrightness(this.accessory.context.device.id, status);
      callback();
    } catch (error: any) {
      this.platform.log.error('setDimmerBrightness failed', error.message);
      callback(error);
    }
  }
}