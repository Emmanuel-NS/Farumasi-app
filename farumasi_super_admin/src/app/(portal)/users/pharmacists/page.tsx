"use client";

import { UsersDirectory } from "@/components/users/users-directory";

export default function PharmacistsUsersPage() {
  return (
    <UsersDirectory
      title="Pharmacists"
      subtitle="Licensed pharmacists and pharmacy administrator accounts"
      apiRoles={["pharmacist", "pharmacy_admin"]}
      breadcrumb="Platform · Users"
      showCreate
      createTitle="Create pharmacist account"
      createRoleOptions={[{ value: "pharmacist", label: "Pharmacist" }]}
    />
  );
}
