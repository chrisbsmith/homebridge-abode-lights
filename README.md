# homebridge-abode-lights

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm version](https://badge.fury.io/js/homebridge-abode-lights.svg)](https://badge.fury.io/js/homebridge-abode-lights)

[Homebridge](https://homebridge.io) plugin that integrates [Abode](https://goabode.com) switches and dimmers into HomeKit, as these are not included in their built-in HomeKit support.

_This is an unofficial integration not created by or affiliated with Abode Systems, Inc._

---

## Updates with `v2.0.0`

`v2.0.0` introduces the ability to integrate the Abode Color Bulbs, as well as other bulbs that are connected. However, the main focus for the `v2.0.0` update is to support the Abode Color Bulbs so there may be some issues with others. Specifically, I know Lifx bulbs can be connected, and the color and color temperature features work, but at the moment, this plugin will treat them as an Abode Color Bulb so they may not meet their full color temperature characteristics.

### Known Issues with `v2.0.0`

- There seems to be a bug with the color temperature wheel and the color presets. If you edit a color and then use the temperature tab to change the temperature, the prefix color will retain the original color, but HomeKit will remember it as a color temperature. Selecting this color will change the bulb to the color temperature, but the prefix color will not update. To address this, select the prefix color and select a color from the color wheel.

- The Abode API can get overwhelmed when too many requests are sent too rapidly. Abode will return a `400` error with a status code that indicates an error 2191. I catch this error and continue processing. Further requests should process eventually. This is most notable when changing colors or color temperatures.

---

## Installation

If you are new to Homebridge, please first read the Homebridge [documentation](https://github.com/homebridge/homebridge/wiki) and installation instructions first.

If you have [Homebridge Config UI](https://github.com/oznu/homebridge-config-ui-x) installed, you can install this plugin by going to the `Plugins` tab, searching for `homebridge-abode-lights`, and installing it.

If you prefer use the command line, you can do so by running:

```sh
npm install -g homebridge-abode-lights
```

## Plugin configuration

To configure this plugin, enter the email and password for your Abode account. You may want to use a dedicated Abode user just for Homebridge.

If you want the plugin to automatically check for removed devices, enter a value (in minutes) for the polling interval. If not, leave it blank.

>Note: the plugin will enforce a 5 minute minimum polling interval.

If you choose to configure this plugin directly instead of using Homebridge Config UI, you'll need to add the platform to your `config.json` file:

```json
{
  "platform": "Abode Lights",
  "email": "YOUR_ABODE_ACCOUNT_EMAIL",
  "password": "YOUR_ABODE_ACCOUNT_PASSWORD",
  "pollingInterval": 5
}
```

## Supported Devices

Currently, this plugin supports the following types of devices:

- Abode Color Bulbs
- Z-Wave Switches (tested with Embrighten indoor and outdoor switches)
- Z-Wave Dimmer Switches (tested with Embrighten (formerly GE) dimmers)
- Lifx bulbs registered with Abode

## Automatic Addition and Removal of Devices

The plugin will now automatically add new devices to HomeKit as they are detected.

Unfortunately, Abode does not send out a notification when devices are removed, so instead the plugin will poll Abode at the frequency of `config.pollingInterval` and check for removed devices, if the option is set.

## Reporting Bugs

I'm sure there are things that I missed in my testing, so please [open new issues](https://github.com/chrisbsmith/homebridge-abode-lights/issues/new) with any bugs that you find.

## Recognition

There are several plugins that were inspirational in this work:

- [homebridge-abode-locks](https://github.com/jasperpatterson/homebridge-abode-locks).
- [homebridge-lifx-plugin](https://github.com/calvarium/homebridge-lifx-plugin)
