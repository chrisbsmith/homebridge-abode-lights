import { setBulbPower, updateBulb } from './light.api'

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

    let action = ''
    if (this.States.power) {
      action = "on";
    } else {
      action = "off";
    }
    console.log('Setting the power: ', { action });
    setBulbPower(this.getProductUuid(), { action }).catch((error) => this.handleError(error));
  }

  async setBrightness(value) {
    this.States.color.brightness = value;
    const data = {
      action: 'setpercent',
      percentage: value
    }
    console.log('### Setting bulb brightness: ', data);
    updateBulb(this.getProductUuid(), data).catch((error) => this.handleError(error));
    // this.update(this.States);
  }

  // { "action": "setcolor", "hue": 57, "saturation": 100 }
  async setHue(value) {
    this.States.color.hue = value;
    console.log('Setting Hue to ', value, ' for bulb ', this.getProductUuid());

    const data = {
      action: 'setcolor',
      hue: value,
      saturation: this.getSaturation(),
    }
    console.log('### Setting bulb hue: ', data);
    updateBulb(this.getProductUuid(), data).catch((error) => this.handleError(error));
  }

  async setSaturation(value) {
    this.States.color.saturation = value;
    console.log('Setting saturation to ', value, ' for bulb ', this.getProductUuid());

    const data = {
      action: 'setcolor',
      hue: this.getHue(),
      saturation: value,
    }
    console.log('### Setting bulb saturation: ', data);
    updateBulb(this.getProductUuid(), data).catch((error) => this.handleError(error));
  }

  getHue() {
    return this.States.color.hue;
  }

  getSaturation() {
    return this.States.color.saturation;
  }

  handleError(err) {
    console.log('Bulb ' + this.getProductName() + ' throws error', err);
    console.log(err.response.data.errorCode)

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

}