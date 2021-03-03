# homebridge-abode-lights

[Homebridge](https://homebridge.io) plugin that integrates [Abode](https://goabode.com) switches and dimmers into HomeKit, as these are not included in their built-in HomeKit support.

_This is an unofficial integration not created by or affiliated with Abode Systems, Inc._

## Installation

If you are new to Homebridge, please first read the Homebridge [documentation](https://github.com/homebridge/homebridge/wiki) and installation instructions first.

If you have [Homebridge Config UI](https://github.com/oznu/homebridge-config-ui-x) installed, you can install this plugin by going to the `Plugins` tab, searching for `homebridge-abode-lights`, and installing it.

If you prefer use the command line, you can do so by running:

```sh
npm install -g homebridge-abode-lights
```

## Plugin configuration

To configure this plugin, enter the email and password for your Abode account. You may want to use a dedicated Abode user just for Homebridge.

If you choose to configure this plugin directly instead of using Homebridge Config UI, you'll need to add the platform to your `config.json` file:

```json
{
	"platform": "Abode Lights",
	"email": "YOUR_ABODE_ACCOUNT_EMAIL",
	"password": "YOUR_ABODE_ACCOUNT_PASSWORD"
}
```

## Recognition

This plugin in highly based on [homebridge-abode-locks](https://github.com/jasperpatterson/homebridge-abode-locks). Major shoutout to [@jasperpatterson](https://github.com/jasperpatterson) for doing all of the major lifting in his plugin that I was able to leverage.
