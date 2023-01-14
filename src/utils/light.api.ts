import { api } from '../abode/api';
import { AbodeDevice } from '../devices/devices';

export const getDevicesFromAbode = () => api.get('/api/v1/devices');
export const getDeviceFromAbode = (id: string) => api.get(`/api/v1/devices/${id}`);
export const updateDimmer = (id: string, data: any) => api.put(`/api/v1/control/light/${id}`, data);
export const updateSwitch = (id: string, data: any) => api.put(`/api/v1/control/power_switch/${id}`, data);
export const setBulbPower = (id: string, data: any) => api.post(`/integrations/v1/devices/${id}`, data);

// Request all the data from Abode, but only return only the device data to the plugin.
export const getDevices = async (): Promise<AbodeDevice[]> => {
  const response = await getDevicesFromAbode().catch(() => {
    throw new Error('Received non-200 response in getDevices.');
  });

  return response.data;
};


// Create an empty device to return if we get a 404 back
let emptyDevice: AbodeDevice;
export const getDevice = async (id: string): Promise<AbodeDevice> => {
  const response = await getDeviceFromAbode(id).
    catch(() => {
      throw new Error('Received non-200 response in getDevice.');
    });

  // A 404 is returned if the device doesn't exist. We'll just return an
  // empty device and check for that on the return.
  if (response.status === 404) {
    return emptyDevice;
  }
  // Return the first device since we only called for 1.
  return response.data[0];
};