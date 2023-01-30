export const enum AbodeDeviceType {
  Switch = 'device_type.power_switch_sensor',
  Dimmer = 'device_type.dimmer_meter',
  LightBulb = 'device_type.light_bulb',
  Hue = 'device_type.hue',
}

export interface AbodeDevice {
  readonly id: string;
  readonly type_tag: AbodeDeviceType;
  readonly name: string;
  readonly version: string;
  readonly uuid: string;
  readonly statuses: Record<string, unknown>;
}

export interface AbodeSwitchDevice extends AbodeDevice {
  readonly type_tag: AbodeDeviceType.Switch;
  readonly status: AbodeSwitchStatus;
}

export interface AbodeDimmerDevice extends AbodeDevice {
  readonly type_tag: AbodeDeviceType.Dimmer;
  readonly status: 'On' | 'Off';
  readonly statuses: {
    level: string;
    switch: string;
  };
  readonly brightness: number;
}

export interface AbodeLightBulbDevice extends AbodeDevice {
  readonly type_tag: AbodeDeviceType.LightBulb;
  readonly status: 'On' | 'Off';
  readonly statuses: {
    saturation: number;
    hue: number;
    level: string;
    switch: string | '1' | '0';
    color_temp: number;
    color_mode: number;
  };
}

export const enum AbodeSwitchStatus {
  On = 'On',
  Off = 'Off',
}

export const enum AbodeSwitchStatusInt {
  On = 1,
  Off = 0,
}

export const enum AbodeDimmerStatus {
  On = 'On',
  Off = 'Off',
}

export const isDeviceTypeSwitch = (device: AbodeDevice): device is AbodeSwitchDevice => {
  return device.type_tag === AbodeDeviceType.Switch;
};

export const isDeviceTypeDimmer = (device: AbodeDevice): device is AbodeDimmerDevice => {
  return device.type_tag === AbodeDeviceType.Dimmer;
};

let lastUpdatedDevice = '';
export const setLastUpdatedDevice = (id: string) => {
  lastUpdatedDevice = id;
  return;
};

export const getLastUpdatedDevice = () => {
  return lastUpdatedDevice;
};
