export const enum AbodeDeviceType {
  Switch = 'device_type.power_switch_sensor',
  Dimmer = 'device_type.dimmer_meter',
  LightBulb = 'device_type.light_bulb',
  Hue = "device_type.hue",
}

export interface AbodeDevice {
  readonly id: string;
  readonly type_tag: AbodeDeviceType;
  readonly name: string;
  readonly version: string;
}