import { AbodeSwitchDevice, AbodeSwitchStatusInt } from "./abode/api";

import { updateSwitch } from "./light.api"


export default class Switch {
  private States = {
    power: 0,
    name: '',
  }

  // private baseUrl = `/api/v1/control/power_switch/`;

  constructor(private readonly light: AbodeSwitchDevice) { }

  public async Init(power: number, name: string) {
    this.States.power = power;
    this.States.name = name;
  }

  private async setPower(status: number) {
    this.States.power = status;
    console.log('### switch: setpower status = ', status);
    updateSwitch(this.light.id, { status }).catch(error => console.log('Error: ', error))
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