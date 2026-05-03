import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { AdminNav } from "@/components/AdminNav";
import { UserMenu } from "@/components/UserMenu";
import { getSessionUser } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/supplier");

  return (
    <>
      <BrandHeader subtitle="Admin Console" variant="admin" rightSlot={<UserMenu email={user.email} />} />
      <AdminNav />
      <div className="flex-1 px-9 py-8">{children}</div>
    </>
  );
}
