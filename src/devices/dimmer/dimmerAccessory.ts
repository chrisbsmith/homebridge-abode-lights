import {
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { AbodeLightsPlatform } from '../../platform';
import Dimmer from './dimmer';

export class AbodeDimmerAccessory {
  public service: Service;
  private dimmer;

  constructor(
    private readonly platform: AbodeLightsPlatform,
    public readonly accessory: PlatformAccessory,
    private readonly light: any,
  ) {
    this.dimmer = new Dimmer(this.light);

    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.dimmer.Init(() => {
      this.setHardwareCharacteristics();
      this.setSoftwareCharacteristics();
      this.bindFunctions();
      this.setState();
    }, (error) => this.handleError(error));
  }

  setHardwareCharacteristics() {

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'abode')
      .setCharacteristic(this.platform.Characteristic.Model, 'Dimmer')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.dimmer.getProductId())
      .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, 'com.abode.abode')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.dimmer.getProductVersion());;
  }

  setSoftwareCharacteristics() {
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.dimmer.getProductName());
  }

  bindFunctions() {
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, this.setDimmerState.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .on(CharacteristicEventTypes.SET, this.setDimmerBrightness.bind(this));

  }

  setState() {
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.dimmer.getOn());
    this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.dimmer.getBrightness());
  }

  handleError(err) {
    this.platform.log.error('Dimmer ' + this.dimmer.getProductName() + ' threw an error', err);
  }

  async setDimmerState(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug(`Set Characteristic power -> ${value} for ${this.dimmer.getProductName()}`);

    try {
      const status = this.convertDimmerTargetStateToAbodeDimmerStatusInt(value);
      await this.dimmer.setOn(status);
      callback();
    } catch (error: any) {
      this.platform.log.error('setSwitchState failed', error.message);
      callback(error);
    }
  }

  async setDimmerBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug(`Set Characteristic brightness -> ${value} for ${this.dimmer.getProductName()}`);

    try {
      await this.dimmer.setBrightness(value);
      callback();
    } catch (error: any) {
      this.platform.log.error('setDimmerBrightness failed', error.message);
      callback(error);
    }
  }

  convertDimmerTargetStateToAbodeDimmerStatusInt(value: CharacteristicValue): number {
    if (value) {
      return <number>value;
    } else {
      return 0;
    }
  }
}
