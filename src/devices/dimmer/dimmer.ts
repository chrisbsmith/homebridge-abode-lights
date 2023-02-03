import { updateDimmer } from '../../utils/light.api';
import { setLastUpdatedDevice } from '../../devices/devices';

export default class Dimmer {
  private States = {
    power: 0,
    brightness: 0,
  };

  constructor(private readonly light: any) { }

  public async Init(callback) {
    this.updateStates(() => {
      callback();
    });
  }

  async updateStates(callback) {
    this.States.power = this.light.statuses.switch;
    if (this.light.statuses.switch === 1) {
      this.States.brightness = this.light.statuses.level;
    }
    callback();
  }

  private async setPower(status: any) {
    this.States.power = status;
    setLastUpdatedDevice(this.getProductId());

    updateDimmer(this.getProductId(), { status }).catch((error) => {
      throw new Error(error);
    });
  }

  private async setBrightnessLevel(level: any) {

    if (level > 100) {
      level = 100;
    } else if (level < 0) {
      level = 0;
    }

    this.States.brightness = level;
    setLastUpdatedDevice(this.getProductId());
    updateDimmer(this.getProductId(), { level }).catch((error) => {
      throw new Error(error);
    });
  }

  // When turning the dimmer on, set the birghtness to the last known brightness state.
  async setOn(value: any) {
    this.setPower(value);
  }

  async setBrightness(value: any) {
    this.setBrightnessLevel(value);
  }

  getOn() {
    return this.States.power;
  }

  getBrightness() {
    return this.States.brightness;
  }

  public getProductId() {
    return this.light.id;
  }

  public getProductUuid() {
    return this.light.uuid;
  }

  public getProductName() {
    return this.light.name;
  }

  public getId() {
    return this.light.id;
  }

  public getProductVersion() {
    return this.light.version;
  }
}
