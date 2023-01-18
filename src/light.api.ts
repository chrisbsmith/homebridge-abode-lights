import { api } from './abode/api'

export const updateDimmer = (id: string, data: any) => api.put(`/api/v1/control/light/${id}`, data)
export const updateSwitch = (id: string, data: any) => api.put(`/api/v1/control/power_switch/${id}`, data)
export const setBulbPower = (id: string, data: any) => api.post(`/integrations/v1/devices/${id}`, data)
export const updateBulb = (id: string, data: any) => api.post(`/integrations/v1/devices/${id}`, data)

// bulb actions:
// - set brightness: POST, {"action":"setpercent","percentage":18}
// - set temp: POST, {"action":"setcolortemperature","colorTemperature":6254}
// - set color (hue): POST, {"action":"setcolor","hue":57,"saturation":100}
// - set color (saturation): POST {"action":"setcolor","hue":57,"saturation":90}