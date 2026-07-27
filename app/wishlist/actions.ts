"use server";

import { revalidatePath } from "next/cache";

import {
  addWishlistItem,
  removeWishlistItem,
  type WishlistItemInput,
} from "@/lib/db/wishlists";
import { createClient } from "@/lib/supabase/server";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function addToWishlistAction(
  input: WishlistItemInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to use the wishlist." };
  }

  const result = await addWishlistItem(userId, input);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/wishlist");
  revalidatePath("/");
  revalidatePath("/deals");
  return { ok: true };
}

export async function removeFromWishlistAction(
  igdbId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to use the wishlist." };
  }

  await removeWishlistItem(userId, igdbId);
  revalidatePath("/wishlist");
  revalidatePath("/");
  revalidatePath("/deals");
  return { ok: true };
}
