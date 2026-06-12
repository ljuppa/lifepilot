import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(JSON.stringify({ event: "admin_layout_profile_error", code: profileError.code }));
    redirect("/dashboard");
  }

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold mb-8">Admin</h1>
      {children}
    </div>
  );
}
