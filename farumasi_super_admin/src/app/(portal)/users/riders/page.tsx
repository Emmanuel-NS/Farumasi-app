"use client";

import { UsersDirectory } from "@/components/users/users-directory";

export default function RidersUsersPage() {
  return (
    <UsersDirectory
      title="Riders"
      subtitle="Delivery rider accounts"
      apiRole="rider"
      breadcrumb="Platform · Users"
      showCreate
      createTitle="Create rider account"
      createRoleOptions={[{ value: "rider", label: "Rider" }]}
    />
  );
}
