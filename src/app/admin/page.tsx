import { redirect } from "next/navigation";
import { countUsers, getCurrentUser } from "@/lib/auth";

export default async function AdminHome() {
  if ((await countUsers()) === 0) redirect("/admin/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  redirect(user.role === "FULL" ? "/admin/cars" : "/admin/sell");
}
