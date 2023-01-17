import { AbodeSwitchDevice, AbodeSwitchStatusInt, sendRequest } from "./abode/api";

export default class Switch {
  private States = {
    power: 0,
    name: '',
  }

  private baseUrl = `/api/v1/control/power_switch/`;

  constructor(private readonly light: AbodeSwitchDevice) { }

  public async Init() { }

  private async setPower(status: number) {
    this.States.power = status;
    console.log('setpower status = ', status);
    const response = await sendRequest(this.baseUrl.concat(this.light.id), { status });
    console.log('sendRequest response: ', response)
  }

  async setOn(status: AbodeSwitchStatusInt) {
    this.setPower(status);
  }

  getOn() {
    return this.States.power;
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