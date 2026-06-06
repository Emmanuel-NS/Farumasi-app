"use client";

import { UsersDirectory } from "@/components/users/users-directory";

export default function PatientsUsersPage() {
  return (
    <UsersDirectory
      title="Patients"
      subtitle="Registered patient accounts on the platform"
      apiRole="patient"
      breadcrumb="Platform · Users"
    />
  );
}
