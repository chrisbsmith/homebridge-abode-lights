import {
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { AbodeLightsPlatform } from './platform';
import {
  controlSwitch,
} from './abode/api';

export class AbodeSwitchAccessory {
  public service: Service;

  constructor(private readonly platform: AbodeLightsPlatform, private readonly accessory: PlatformAccessory) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'abode')
      .setCharacteristic(this.platform.Characteristic.Model, 'Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id)
      .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, 'com.abode.abode');

    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, this.setSwitchState.bind(this));
  }


  async setSwitchState(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('setSwitchState', this.accessory.context.device.id, value);

    try {
      const status = this.platform.convertSwitchTargetStateToAbodeSwitchStatusInt(value);
      await controlSwitch(this.accessory.context.device.id, status);
      callback();
    } catch (error: any) {
      this.platform.log.error('setSwitchState failed', error.message);
      callback(error);
    }
  }
}