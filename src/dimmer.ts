import { AbodeDimmerDevice, sendRequest } from "./abode/api";

export default class Dimmer {
  private States = {
    power: 0,
    brightness: 0,
    name: '',
  }

  baseUrl = '/api/v1/control/light/';

  constructor(private readonly light: AbodeDimmerDevice) { }

  public async Init() { }

  private async setPower(status: any) {
    this.States.power = status;
    console.log('setpower status = ', status);
    const response = await sendRequest(this.baseUrl.concat(this.light.id), { status });
    console.log('sendRequest response: ', response)
  }

  private async setBrightnessLevel(level: any) {
    this.States.brightness = level;
    console.log('setBrightnessLevel level = ', level);
    const response = await sendRequest(this.baseUrl.concat(this.light.id), { level });
    console.log('sendRequest response: ', response)
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