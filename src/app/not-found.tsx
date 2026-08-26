import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-3xl font-semibold text-foreground">404</h1>
      <p className="text-muted-foreground">This page could not be found.</p>
      <Link
        href="/login"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Go to login
      </Link>
    </div>
  );
}
