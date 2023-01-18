import { AbodeDimmerDevice } from "./abode/api";

import { updateDimmer } from "./light.api"

export default class Dimmer {
  private States = {
    power: 0,
    brightness: 0,
    name: '',
  }

  baseUrl = '/api/v1/control/light/';

  constructor(private readonly light: AbodeDimmerDevice) { }

  public async Init(power: number, brightness: number, name: string) {
    this.States.power = power;
    this.States.brightness = brightness;
    this.States.name = name;
  }

  private async setPower(status: any) {
    this.States.power = status;
    console.log('setpower status = ', status);
    updateDimmer(this.light.id, { status }).catch(error => console.log('Error: ', error))
  }

  private async setBrightnessLevel(level: any) {
    this.States.brightness = level;
    console.log('setBrightnessLevel level = ', level);
    updateDimmer(this.light.id, { level }).catch(error => console.log('Error: ', error))
  }

  // When turning the dimmer on, set the birghtness to the last known brightness state.
  async setOn(value: any) {
    if (value !== 0) {
      this.setBrightnessLevel(this.States.brightness);
    }
    this.setPower(value);
  }

  async setBrightness(value: any) {
    this.setBrightnessLevel(value)
  }

  getOn() {
    return this.States.power;
  }

  getBrightness() {
    return this.States.brightness;
  }

  getName() {
    return this.States.name;
  }

  public getId() {
    return this.light.id;
  }

  public getVersion() {
    return this.light.version;
  }

}