// import { sendRequest } from "./abode/api";

export default class Bulb {
  private States = {
    power: 0,
    color: { hue: 120, saturation: 0, brightness: 100, kelvin: 8994 },
    name: '',
  }
  constructor(private readonly light: any) { }

  public async Init(callback, error) {
    this.updateStates(() => {
      callback();
    }, err => error(err));
  }

  public getProductId() {
    return this.light.id;
  }

  public getName() {
    return this.light.name;
  }

  async updateStates(callback) {
    this.getStates((state) => {
      if (state !== null) {
        this.States = state;
      } else {
        this.setPower(0);
      }
      callback();
    }, () => {
      this.setPower(0);
      callback();
    });
  }

  getStates(callback, errorFallback) {
    this.light.getState((err, value) => {
      if (err) {
        errorFallback(err);
      }
      callback(value);
    });
  }

  private setPower(value) {
    this.States.power = value;
  }

  async setOn(value) {
    this.States.power = value;

    if (this.States.power > 0) {
      this.light.on();
    } else {
      this.light.off();
    }
  }

  update(state) {
    this.light.color(state.color.hue, state.color.saturation, state.color.brightness);
  }

  async setBrightness(value) {
    this.States.color.brightness = value;
    this.update(this.States);
  }
}