import { redirect } from "next/navigation";

export default function LegacyWithdrawalsRedirect() {
  redirect("/finance/withdrawals");
}
