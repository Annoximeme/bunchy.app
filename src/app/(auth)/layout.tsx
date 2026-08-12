import Link from "next/link";
import { brand } from "@/lib/brand";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 py-6">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          {brand.name}
          <span className="text-accent">.</span>
        </Link>
      </header>
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 pb-16"
      >
        <div className="w-full max-w-md animate-rise">{children}</div>
      </main>
    </div>
  );
}
