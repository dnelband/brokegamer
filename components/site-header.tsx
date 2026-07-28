import Link from "next/link";

import { AuthNav } from "@/components/auth-nav";
import { BrandWordmark } from "@/components/brand-wordmark";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SiteHeader({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="w-fit">
        <BrandWordmark size={size} />
      </Link>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <Link
          href="/deals"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stroke text-muted transition-colors hover:border-muted hover:text-fg"
          aria-label="Search deals"
        >
          <SearchIcon className="h-4 w-4" />
        </Link>
        <AuthNav />
      </div>
    </header>
  );
}
