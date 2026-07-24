import Link from "next/link";

import { AuthNav } from "@/components/auth-nav";
import { BrandWordmark } from "@/components/brand-wordmark";

export function SiteHeader({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/deals" className="w-fit">
        <BrandWordmark size={size} />
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <AuthNav />
      </div>
    </header>
  );
}
