// import { sendRequest } from "./abode/api";

export default class Bulb {
  private States = {
    power: 0,
    color: { hue: 120, saturation: 0, brightness: 100, kelvin: 8994 },
    name: '',
  }
  constructor(private readonly light: any) { }

  public async Init(callback) {
    this.updateStates(() => {
      callback();
    });
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

  async updateStates(callback) {
    console.log('updating bulb states')
    callback();
    // this.getStates((state) => {
    //   if (state !== null) {
    //     this.States = state;
    //   } else {
    //     this.setPower(0);
    //   }
    //   callback();
    // }, () => {
    //   this.setPower(0);
    //   callback();
    // });
  }

  getStates(callback, errorFallback) {
    this.light.getState((err, value) => {
      if (err) {
        errorFallback(err);
      }
      callback(value);
    });
  }

  // private setPower(value) {
  //   this.States.power = value;
  // }

  update(state) {
    this.light.color(state.color.hue, state.color.saturation, state.color.brightness);
  }

  async setOn(value) {
    this.States.power = value;

    if (this.States.power > 0) {
      console.log('Setting the power on')
    } else {
      console.log('Setting the power off')
    }
  }

  async setBrightness(value) {
    this.States.color.brightness = value;
    // this.update(this.States);
  }

  async setHue(value) {
    this.States.color.hue = value;
    console.log('Setting Hue to ', value, ' for bulb ', this.getProductUuid());
    // this.update(this.States, this.Settings.ColorDuration);
  }

  async setSaturation(value) {
    this.States.color.saturation = value;
    console.log('Setting saturation to ', value, ' for bulb ', this.getProductUuid());
    // this.update(this.States, this.Settings.ColorDuration);
  }

  getHue() {
    return this.States.color.hue;
  }

  getSaturation() {
    return this.States.color.saturation;
  }

}