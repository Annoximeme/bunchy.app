import type { Metadata } from "next";
import { VerifyEmailPanel } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailPanel token={token ?? ""} />;
}
