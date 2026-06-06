"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UsersDirectory } from "@/components/users/users-directory";
import { useAuthStore } from "@/store/auth-store";

const ADMIN_ROLE_OPTIONS = [
  { value: "operations_admin", label: "Operations Admin" },
  { value: "finance_admin", label: "Finance Admin" },
  { value: "compliance_admin", label: "Compliance Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export default function AdminsUsersPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (role && role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  if (role && role !== "super_admin") {
    return null;
  }

  return (
    <UsersDirectory
      title="Platform admins"
      subtitle="Super admins only — create and manage admin-level accounts"
      apiRoles={["super_admin", "operations_admin", "finance_admin", "compliance_admin"]}
      breadcrumb="Platform · Users · Admins"
      showCreate
      createTitle="Create admin account"
      createRoleOptions={ADMIN_ROLE_OPTIONS}
    />
  );
}
