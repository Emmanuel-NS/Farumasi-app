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

export type UserOut = BackendUser;

export interface PaginatedUsers {
  items: BackendUser[];
  total: number;
  offset: number;
  limit: number;
}

const roleMap: Record<string, string> = {
  patient: "Patient",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  pharmacy_admin: "Pharmacy Admin",
  partner_company_admin: "Partner Admin",
  super_admin: "Super Admin",
  operations_admin: "Operations Admin",
  finance_admin: "Finance Admin",
  compliance_admin: "Compliance Admin",
  rider: "Rider",
  supplier: "Supplier",
  hospital_admin: "Hospital Admin",
};

const statusMap: Record<string, User["status"]> = {
  active: "Active",
  pending_verification: "Pending Verification",
  pending: "Pending Verification",
  suspended: "Suspended",
  restricted: "Restricted",
  archived: "Archived",
};

/** UI label → API status value */
export const apiStatusFromLabel = (label: User["status"]): string => {
  const map: Partial<Record<User["status"], string>> = {
    Active: "active",
    "Pending Verification": "pending_verification",
    Suspended: "suspended",
    Restricted: "restricted",
    Archived: "archived",
  };
  return map[label] ?? "active";
};

function adapt(u: BackendUser): User {
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone ?? "",
    role: (roleMap[u.role] ?? u.role) as User["role"],
    status: statusMap[u.status] ?? "Active",
    lastActive: u.last_login ?? u.created_at,
    createdAt: u.created_at,
  };
}

export const usersService = {
  async getUsers(params?: {
    offset?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: User[]; total: number }> {
    const { data } = await api.get<PaginatedUsers>("/users/", {
      params: { limit: 100, ...params },
    });
    return { items: data.items.map(adapt), total: data.total };
  },

  async getUserById(id: string): Promise<User> {
    const { data } = await api.get<BackendUser>(`/users/${id}`);
    return adapt(data);
  },

  async updateUserStatus(id: string, status: string, reason?: string): Promise<User> {
    const { data } = await api.patch<BackendUser>(`/users/${id}/status`, { status, reason });
    return adapt(data);
  },

  async createUser(payload: {
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    temporary_password?: string;
  }) {
    const { data } = await api.post<{ user: BackendUser; temporary_password: string }>("/admin/users", payload);
    return data;
  },
};
