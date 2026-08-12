import Link from "next/link";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 py-6">
        <Link href="/" aria-label={brand.name}>
          <BunchyLogo height={22} color="var(--color-ink)" />
        </Link>
      </header>
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 pb-16"
      >
        <div className="w-full max-w-md animate-rise">{children}</div>
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 pb-8 text-center text-xs text-muted">
        By joining you agree to our{" "}
        <Link href="/terms" className="text-accent-ink hover:underline">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-accent-ink hover:underline">
          privacy policy
        </Link>
        .
      </footer>
    </div>
  );
}
