import { api } from '../abode/api';
import { AbodeDevice } from '../devices/devices';
import { debounce } from 'lodash';

export const getDevicesFromAbode = () => api.get('/api/v1/devices');
export const updateDimmer = (id: string, data: any) => api.put(`/api/v1/control/light/${id}`, data);
export const updateSwitch = (id: string, data: any) => api.put(`/api/v1/control/power_switch/${id}`, data);
export const setBulbPower = (id: string, data: any) => api.post(`/integrations/v1/devices/${id}`, data);

export const updateBulb = debounce(async (id: string, data: any) => {
  api.post(`/integrations/v1/devices/${id}`, data);
}, 500);

// Request all the data from Abode, but only return only the device data to the plugin.
export const getDevices = async (): Promise<AbodeDevice[]> => {
  const response = await getDevicesFromAbode().catch(() => {
    throw new Error('Received non-200 response in getDevices.');
  });

  return response.data;
};