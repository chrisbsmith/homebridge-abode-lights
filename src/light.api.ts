import { api } from './abode/api'

export const updateDimmer = (id: string, data: any) => api.put(`/api/v1/control/light/${id}`, data)
export const updateSwitch = (id: string, data: any) => api.put(`/api/v1/control/power_switch/${id}`, data)
