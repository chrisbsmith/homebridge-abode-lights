import {
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { AbodeLightsPlatform } from '../../platform';

import Switch from './switch';

export class AbodeSwitchAccessory {
  public service: Service;
  private switch;

  constructor(
    private readonly platform: AbodeLightsPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly light: any,
  ) {
    this.switch = new Switch(this.light);

    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    this.switch.Init(
      () => {
        this.setHardwareCharacteristics();
        this.setSoftwareCharacteristics();
        this.bindFunctions();
        this.setState();
      },
      (error) => this.handleError(error),
    );
  }

  setHardwareCharacteristics() {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'abode')
      .setCharacteristic(this.platform.Characteristic.Model, 'Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.switch.getProductUuid())
      .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, 'com.abode.abode');
  }

  setSoftwareCharacteristics() {
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.switch.getProductName());
  }

  bindFunctions() {
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, this.setSwitchState.bind(this));
  }

  setState() {
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.switch.getOn());
  }

  handleError(err) {
    this.platform.log.error('Switch ' + this.switch.getProductName() + ' threw an error', err);
  }

  async setSwitchState(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug(`Set Characteristic power -> ${value} for ${this.switch.getProductName()}`);

    try {
      const status = this.convertSwitchTargetStateToAbodeSwitchStatusInt(value);
      await this.switch.setOn(status);
      callback();
    } catch (error: any) {
      this.platform.log.error('setSwitchState failed', error.message);
      callback(error);
    }
  }

  convertSwitchTargetStateToAbodeSwitchStatusInt(value: CharacteristicValue): number {
    if (value) {
      return 1;
    } else {
      return 0;
    }
  }
}
