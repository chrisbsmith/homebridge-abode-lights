import {
  // CharacteristicEventTypes,
  // CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { AbodeLightsPlatform } from './platform';

import Bulb from './bulb'

export class AbodeBulbAccessory {
  public service: Service;
  private bulb;

  constructor(private readonly platform: AbodeLightsPlatform, public readonly accessory: PlatformAccessory, private readonly light: any) {

    this.bulb = new Bulb(this.light);

    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.bulb.Init(() => {
      this.setHardwareCharacteristics();
      this.setSoftwareCharacteristics();
      this.bindFunctions();
    }, (error) => this.handleError(error));

    // this.accessory
    //   .getService(this.platform.Service.AccessoryInformation)!
    //   .setCharacteristic(this.platform.Characteristic.Manufacturer, 'abode')
    //   .setCharacteristic(this.platform.Characteristic.Model, 'Dimmer')
    //   .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id)
    //   .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, 'com.abode.abode');


  }

  setHardwareCharacteristics() {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'abode')
      .setCharacteristic(this.platform.Characteristic.Model, this.bulb.getProductName())
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.bulb.getProcutId())
      .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, 'com.abode.abode');;
  }

  setSoftwareCharacteristics() {
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.bulb.getName());
  }

  bindFunctions() {
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this));
    // .on(CharacteristicEventTypes.SET, this.setDimmerState.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this));
    // .on(CharacteristicEventTypes.SET, this.setDimmerBrightness.bind(this));
  }

  handleError(err) {
    this.platform.log.warn('Bulb ' + this.bulb.getName() + ' throughs error', err);
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  async setOn(value: CharacteristicValue) {
    this.setValue('On', this.bulb.setOn, this.bulb, value);
  }

  async setBrightness(value: CharacteristicValue) {
    this.setValue('Brightness', this.bulb.setBrightness, this.bulb, value);
  }

  async setHue(value: CharacteristicValue) {
    this.setValue('Hue', this.bulb.setHue, this.bulb, value);
  }

  async setSaturation(value: CharacteristicValue) {
    this.setValue('Saturation', this.bulb.setSaturation, this.bulb, value);
  }

  setValue(name, func, obj, value) {
    // this.resetWatcher();
    func.call(obj, value);
    this.platform.log.debug(`Set Characteristic ${name} -> `, value);
  }
}