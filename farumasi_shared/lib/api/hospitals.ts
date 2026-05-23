import { getClient } from "./client";
import type { DoctorProfileOut, HospitalOut } from "./types";

export const hospitalsApi = {
  list: () => getClient().get<HospitalOut[]>("/hospitals/"),
  getById: (id: string) => getClient().get<HospitalOut>(`/hospitals/${id}`),
  update: (id: string, payload: Partial<HospitalOut>) =>
    getClient().patch<HospitalOut>(`/hospitals/${id}`, payload),

  listDoctors: (hospitalId: string) =>
    getClient().get<DoctorProfileOut[]>(`/hospitals/${hospitalId}/doctors`),

  inviteDoctor: (hospitalId: string, payload: unknown) =>
    getClient().post<DoctorProfileOut>(`/hospitals/${hospitalId}/doctors`, payload),

  setDoctorStatus: (hospitalId: string, doctorId: string, payload: { status: string }) =>
    getClient().patch<DoctorProfileOut>(
      `/hospitals/${hospitalId}/doctors/${doctorId}/status`,
      payload,
    ),

  listDepartments: (hospitalId: string) =>
    getClient().get<unknown[]>(`/hospitals/${hospitalId}/departments`),

  createDepartment: (hospitalId: string, payload: unknown) =>
    getClient().post<unknown>(`/hospitals/${hospitalId}/departments`, payload),

  listAdmins: (hospitalId: string) => getClient().get<unknown[]>(`/hospitals/${hospitalId}/admins`),
};
