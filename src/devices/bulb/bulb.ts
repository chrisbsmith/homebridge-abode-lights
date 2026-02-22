import { setBulbPower } from '../../utils/light.api';
import { convertKelvinMireds } from '../../utils/colorFunctions';
import { AbodeBulb } from './bulbInfo';
import { setLastUpdatedDevice } from '../devices';
import { api } from '../../abode/api';


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
      color_temp: 2700,
    },
  };

  constructor(private readonly light: any) {
    this.ID = this.light.id;
    this.UUID = this.light.uuid;
    this.Name = this.light.name;
    this.Version = this.light.version;
  }

  public async Init(callback) {
    this.updateStates(() => {
      callback();
    });
  }

  public getProductId() {
    return this.ID;
  }

  public getProductUuid() {
    return this.UUID;
  }

  public getProductName() {
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
    this.States.color.hue = (this.light.statuses.hue === 'N/A') ? 0 : this.light.statuses.hue;
    this.States.color.saturation = (this.light.statuses.saturation === 'N/A') ? 0 : this.light.statuses.saturation;
    this.States.color.brightness = (this.light.statuses.level === 'N/A') ? 0 : this.light.statuses.level;
    const rawTemp = this.light.statuses.color_temp;
    const mireds = (rawTemp !== null && Number.isFinite(Number(rawTemp)) && Number(rawTemp) > 0)
      ? Math.floor(convertKelvinMireds(Number(rawTemp)))
      : this.getMaxMired(); // default warm (e.g. 370 mireds)
    this.States.color.color_temp = mireds;

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
    await setBulbPower(this.getProductUuid(), { action });
  }

  async setBrightness(value) {
    this.States.color.brightness = Math.max(0, Math.min(value, 100));
    const data = {
      action: 'setpercent',
      percentage: this.States.color.brightness,
    };

    setLastUpdatedDevice(this.getProductId());
    await this.updateBulb(this.getProductUuid(), data);
  }

  async setHue(value) {
    this.States.color.hue = value;
  }

  async setSaturation(value) {
    this.States.color.saturation = value;

    const data = {
      action: 'setcolor',
      hue: this.getHue(),
      saturation: value,
    };
    setLastUpdatedDevice(this.getProductId());
    await this.updateBulb(this.getProductUuid(), data);
  }

  async setColorTemperature(value) {
    // value is in Kelvin; convert to mireds and clamp to bulb's mired range
    const mireds = convertKelvinMireds(value);
    const calculatedTemp = Math.floor(Math.min(Math.max(mireds, this.getMinMired()), this.getMaxMired()));
    const data = {
      action: 'setcolortemperature',
      colorTemperature: calculatedTemp,
    };
    this.States.color.color_temp = calculatedTemp;

    setLastUpdatedDevice(this.getProductId());
    await this.updateBulb(this.getProductUuid(), data);
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
    let value = Number(this.States.color.color_temp);
    if (!Number.isFinite(value)) {
      value = this.getMaxMired(); // default warm (e.g. 370 mireds)
    }
    if (value < 153) {
      value = 153;
    } else if (value > 500) {
      value = 500;
    }
    return value;
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

  // This API call has to be in declared at the bulb object level so that
  // each bulb object inherits the function and does not get caught in the
  // debounce
  // updateBulb = debounce(async (id: string, data: any) => {
  //   await api.post(`/integrations/v1/devices/${id}`, data);
  // }, 500);

  async updateBulb(id: string, data: any) {
    await api.post(`/integrations/v1/devices/${id}`, data);
  }
}
