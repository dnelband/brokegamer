"use client";

import { useState } from "react";
import Link from "next/link";

import { BrandWordmark } from "@/components/brand-wordmark";
import { ChangelogDialog } from "@/components/changelog-dialog";
import type { ChangelogRelease } from "@/lib/changelog";

interface SiteFooterProps {
  version: string;
  releases: ChangelogRelease[];
}

export function SiteFooter({ version, releases }: SiteFooterProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-stroke">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex flex-col gap-1">
            <Link href="/" className="w-fit">
              <BrandWordmark size="sm" />
            </Link>
            <p className="text-sm text-muted">Broke. Still gaming.</p>
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end">
            <p className="text-xs text-muted">
              Deals under €10 · PC &amp; console
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-fit cursor-pointer text-xs text-accent transition-colors hover:text-fg"
            >
              v{version}
            </button>
          </div>
        </div>
      </footer>
      <ChangelogDialog
        open={open}
        onClose={() => setOpen(false)}
        releases={releases}
      />
    </>
  );
}
