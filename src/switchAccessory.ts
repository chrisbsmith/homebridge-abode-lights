import {
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { AbodeLightsPlatform } from './platform';
import {
  AbodeSwitchDevice,
} from './abode/api';

import Switch from './switch';

export class AbodeSwitchAccessory {
  public service: Service;
  private switch;

  constructor(private readonly platform: AbodeLightsPlatform, private readonly accessory: PlatformAccessory, private readonly light: AbodeSwitchDevice) {

    this.switch = new Switch(this.light);

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'abode')
      .setCharacteristic(this.platform.Characteristic.Model, 'Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id)
      .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, 'com.abode.abode');
    // .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.device.version);


    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, this.setSwitchState.bind(this));

    this.switch.Init();
  }


  async setSwitchState(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('setSwitchState', this.switch.getId(), value);

    try {
      const status = this.platform.convertSwitchTargetStateToAbodeSwitchStatusInt(value);
      this.platform.log.debug('Calling switch.id: ', this.switch.getId())
      this.platform.log.debug('Switching for switch: ', this.switch.getId())
      // await controlSwitch(this.switch.getId(), status);
      await this.switch.setOn(status);
      callback();
    } catch (error: any) {
      this.platform.log.error('setSwitchState failed', error.message);
      callback(error);
    }
  }
}