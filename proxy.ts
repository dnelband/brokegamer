import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Next.js 16 request proxy (replaces legacy root `middleware.ts`). */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets and images; run on pages + auth routes.
     */
    "/((?!_next/static|_next/image|api/img(?:/.*)?|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
