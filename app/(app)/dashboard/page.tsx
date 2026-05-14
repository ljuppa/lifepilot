import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold">Welcome to LifePilot</h1>
        <p className="text-muted-foreground">
          You&apos;re signed in as <span className="font-medium text-foreground">{user.email}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Your personalised AI coaching dashboard is coming in the next sprint.
        </p>
        <form action="/api/auth/sign-out" method="POST">
          <button
            type="submit"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
