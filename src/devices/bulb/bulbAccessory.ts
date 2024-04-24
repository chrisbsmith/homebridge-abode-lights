import {
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { AbodeLightsPlatform } from '../../platform';

import Bulb from './bulb';

export class AbodeBulbAccessory {
  public service: Service;
  private bulb;

  constructor(
    private readonly platform: AbodeLightsPlatform,
    public readonly accessory: PlatformAccessory,
    private readonly light: any,
  ) {
    this.bulb = new Bulb(this.light);

    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.bulb.Init(
      () => {
        this.setHardwareCharacteristics();
        this.setSoftwareCharacteristics();
        this.bindFunctions();
        // this.setState();
      },
      (error) => this.handleError(error),
    );
  }

  setHardwareCharacteristics() {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.bulb.getManufacturer())
      .setCharacteristic(this.platform.Characteristic.Model, this.bulb.getProductName())
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.bulb.getProductId())
      .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, 'com.abode.abode')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.bulb.getProductVersion());

    this.service
      .setCharacteristic(this.platform.Characteristic.On, this.bulb.getOn())
      .setCharacteristic(this.platform.Characteristic.Brightness, this.bulb.getBrightness())
      .setCharacteristic(this.platform.Characteristic.Hue, this.bulb.getHue())
      .setCharacteristic(this.platform.Characteristic.Saturation, this.bulb.getSaturation())
      .setCharacteristic(this.platform.Characteristic.ColorTemperature, this.bulb.getColorTemperature());
  }

  setSoftwareCharacteristics() {
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.bulb.getProductName());
  }

  bindFunctions() {
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, this.setOn.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .on(CharacteristicEventTypes.SET, this.setBrightness.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Hue)
      .on(CharacteristicEventTypes.SET, this.setHue.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Saturation)
      .on(CharacteristicEventTypes.SET, this.setSaturation.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.ColorTemperature)
      .on(CharacteristicEventTypes.SET, this.setColorTemperature.bind(this))
      .setProps({ minValue: this.bulb.getMinMired(), maxValue: this.bulb.getMaxMired() });
  }

  setState() {
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.bulb.getOn());

    this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.bulb.getBrightness());

    this.service.getCharacteristic(this.platform.Characteristic.Hue).updateValue(this.bulb.getHue());

    this.service.getCharacteristic(this.platform.Characteristic.Saturation).updateValue(this.bulb.getSaturation());

    this.service
      .getCharacteristic(this.platform.Characteristic.ColorTemperature)
      .updateValue(this.bulb.getColorTemperature());
  }

  handleError(err) {
    this.platform.log.error('Bulb ' + this.bulb.getProductName() + ' threw an error', err);
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  setSwitch(value: CharacteristicValue) {
    this.setValue('On', this.bulb.setOn, this.bulb, value);
  }

  async setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.setValue('On', this.bulb.setOn, this.bulb, value);
    callback();
  }

  async setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.setValue('Brightness', this.bulb.setBrightness, this.bulb, value);
    callback();
  }

  async setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.setValue('Hue', this.bulb.setHue, this.bulb, value);
    callback();
  }

  async setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.setValue('Saturation', this.bulb.setSaturation, this.bulb, value);
    callback();
  }

  async setColorTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.setValue('ColorTemperature', this.bulb.setColorTemperature, this.bulb, value);
    callback();
  }

  setValue(name, func, obj, value) {
    this.platform.log.debug(
      `Set Characteristic ${name} -> ${value} for ${obj.getProductName()}, ${obj.getProductId()}`,
    );
    func.call(obj, value);
  }

}
