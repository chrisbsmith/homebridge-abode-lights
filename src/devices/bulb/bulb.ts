import { setBulbPower, updateBulb } from '../../utils/light.api';

import { convertKelvinMireds } from '../../utils/colorFunctions';

import { AbodeBulb } from './bulbInfo';

import { setLastUpdatedDevice } from '../devices';

export default class Bulb {
  private ID = '';
  private UUID = '';
  private Name = '';
  private Version = '';
  private States = {
    power: 0,
    color: {
      hue: 120,
      saturation: 0,
      brightness: 100,
      color_temp: 200,
    },
  };

  constructor(private readonly light: any) { }

  public async Init(callback) {
    this.updateStates(() => {
      callback();
    });
  }

  public getProductId() {
    // return this.light.id;
    return this.ID;
  }

  public getProductUuid() {
    // return this.light.uuid;
    return this.UUID;
  }

  public getProductName() {
    // return this.light.name;
    return this.Name;
  }

  public getProductVersion() {
    return this.Version;
  }

  async updateStates(callback) {
    this.ID = this.light.id;
    this.UUID = this.light.uuid;
    this.Name = this.light.name;
    this.Version = this.light.version;
    this.States.power = this.light.statuses.switch;
    this.States.color.hue = this.light.statuses.hue;
    this.States.color.saturation = this.light.statuses.saturation;
    this.States.color.brightness = this.light.statuses.level;
    this.States.color.color_temp = Math.floor(convertKelvinMireds(this.light.statuses.color_temp));

    callback();
  }

  async setOn(value) {
    const originalState = this.States.power;

    // Only make a call to the API if the values have changed.
    if (originalState === value) {
      return;
    }
    this.States.power = value;

    let action = '';
    if (this.States.power) {
      action = 'on';
    } else {
      action = 'off';
    }
    setLastUpdatedDevice(this.getProductId());
    setBulbPower(this.getProductUuid(), { action }).catch((error) => {
      throw new Error(error);
    });
  }

  async setBrightness(value) {
    if (value > 100) {
      value = 100;
    } else if (value < 0) {
      value = 0;
    }
    this.States.color.brightness = value;
    const data = {
      action: 'setpercent',
      percentage: value,
    };

    setLastUpdatedDevice(this.getProductId());
    updateBulb(this.getProductUuid(), data)?.catch((error) => {
      throw new Error(error);
    });
  }

  // TODO: Testing - HomeKit always triggers a Hue update before a Saturation update. Rather
  // than sending two requests to Abode to update Hue and then Saturation, just set the hue on
  // the device, and then let the setSaturation function handle the update to Abode.
  async setHue(value) {
    this.States.color.hue = value;

    // const data = {
    //   action: 'setcolor',
    //   hue: value,
    //   saturation: this.getSaturation(),
    // };
  }

  async setSaturation(value) {
    this.States.color.saturation = value;

    const data = {
      action: 'setcolor',
      hue: this.getHue(),
      saturation: value,
    };
    setLastUpdatedDevice(this.getProductId());
    updateBulb(this.getProductUuid(), data)?.catch((error) => {
      throw new Error(error);
    });
  }

  async setColorTemperature(value) {
    const data = {
      action: 'setcolortemperature',
      colorTemperature: Math.min(Math.max(convertKelvinMireds(value), this.getMinKelvin()), this.getMaxKelvin()),
    };

    setLastUpdatedDevice(this.getProductId());
    updateBulb(this.getProductUuid(), data)?.catch((error) => {
      throw new Error(error);
    });
  }

  getOn() {
    return this.States.power;
  }

  getBrightness() {
    return this.States.color.brightness;
  }

  getHue() {
    return this.States.color.hue;
  }

  getSaturation() {
    return this.States.color.saturation;
  }

  getColorTemperature() {
    return this.States.color.color_temp;
  }

  public getMinKelvin() {
    return Math.min(...(AbodeBulb.temperature_range || []));
  }

  public getMaxKelvin() {
    return Math.max(...(AbodeBulb.temperature_range || []));
  }

  getMaxMired() {
    return Math.floor(convertKelvinMireds(this.getMinKelvin()));
  }

  getMinMired() {
    return Math.ceil(convertKelvinMireds(this.getMaxKelvin()));
  }

  getManufacturer() {
    return AbodeBulb.manufacturer;
  }
}
