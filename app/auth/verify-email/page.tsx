import Link from "next/link";

interface Props {
  searchParams: Promise<{ resent?: string; error?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const resent = params.resent === "true";
  const expired = params.error === "expired";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        {expired && resent ? (
          <>
            <h1 className="text-2xl font-semibold">Link expired</h1>
            <p className="text-muted-foreground">
              That link has expired — we&apos;ve sent you a new one. Check your inbox.
            </p>
          </>
        ) : expired ? (
          <>
            <h1 className="text-2xl font-semibold">Link expired</h1>
            <p className="text-muted-foreground">
              That verification link is no longer valid. Please sign up again or contact support.
            </p>
            <Link href="/sign-up" className="text-primary underline-offset-4 hover:underline text-sm">
              Back to sign up
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Verify your email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a verification link to your email. Click it to activate your account.
            </p>
            <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline text-sm">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
