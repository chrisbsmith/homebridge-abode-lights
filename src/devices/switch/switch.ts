import { updateSwitch } from '../../utils/light.api';
import { setLastUpdatedDevice } from '../devices';

export default class Switch {
  private States = {
    power: 0,
    name: '',
  };

  constructor(private readonly light: any) { }

  public async Init(callback) {
    this.updateStates(() => {
      callback();
    });
  }

  async updateStates(callback) {
    this.States.power = this.light.statuses.switch;
    callback();
  }

  private async setPower(status: number) {
    this.States.power = status;
    setLastUpdatedDevice(this.getProductId());
    updateSwitch(this.getProductId(), { status }).catch((error) => {
      throw new Error(error);
    });
  }

  async setOn(status: number) {
    this.setPower(status);
  }

  public getProductUuid() {
    return this.light.uuid;
  }

  public getProductName() {
    return this.light.name;
  }

  getOn() {
    return this.States.power;
  }

  public getProductId() {
    return this.light.id;
  }

  public getVersion() {
    return this.light.version;
  }
}
