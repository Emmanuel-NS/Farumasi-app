import api from "@/lib/api";
import type { User } from "@/types";

export interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: string;
  status: string;
  is_verified: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface PaginatedUsers {
  items: BackendUser[];
  total: number;
  offset: number;
  limit: number;
}

function adapt(u: BackendUser): User {
  const roleMap: Record<string, string> = {
    patient: "Patient", doctor: "Doctor", pharmacist: "Pharmacist",
    pharmacy_admin: "Pharmacy Admin", super_admin: "Super Admin",
    rider: "Rider", supplier: "Supplier", hospital_admin: "Hospital Admin",
  };
  const statusMap: Record<string, string> = {
    active: "Active", pending: "Pending Verification",
    suspended: "Suspended", restricted: "Restricted",
  };
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone ?? "",
    role: (roleMap[u.role] ?? u.role) as User["role"],
    status: (statusMap[u.status] ?? "Active") as User["status"],
    lastActive: u.last_login ?? u.created_at,
    createdAt: u.created_at,
  };
}

export const usersService = {
  async getUsers(params?: { offset?: number; limit?: number; role?: string; search?: string }): Promise<{ items: User[]; total: number }> {
    const { data } = await api.get<PaginatedUsers>("/users/", { params: { limit: 50, ...params } });
    return { items: data.items.map(adapt), total: data.total };
  },

  async getUserById(id: string): Promise<User> {
    const { data } = await api.get<BackendUser>(`/users/${id}`);
    return adapt(data);
  },

  async updateUserStatus(id: string, status: string): Promise<User> {
    const { data } = await api.patch<BackendUser>(`/users/${id}/status`, { status });
    return adapt(data);
  },
};
