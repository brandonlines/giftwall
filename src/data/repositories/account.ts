import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase, currentUserId } from "../../lib/supabase";

// Self-service account controls required for the app stores.
export const accountRepo = {
  // Gathers everything tied to the signed-in user (their profile, group
  // memberships, own wishlists + items, own claims, own comments), writes it
  // to a JSON file and opens the share sheet so the user can keep a copy.
  async exportData(): Promise<void> {
    const uid = await currentUserId();

    const [profile, memberships, wishlists, claims, comments] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("memberships").select("*").eq("user_id", uid),
      supabase.from("wishlists").select("*").eq("owner_id", uid),
      supabase.from("claims").select("*").eq("buyer_id", uid),
      supabase.from("item_comments").select("*").eq("author_id", uid),
    ]);

    const listIds = (wishlists.data ?? []).map((w) => w.id);
    const items = listIds.length
      ? await supabase.from("items").select("*").in("list_id", listIds)
      : { data: [] };

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: profile.data ?? null,
      memberships: memberships.data ?? [],
      wishlists: wishlists.data ?? [],
      items: items.data ?? [],
      claims: claims.data ?? [],
      comments: comments.data ?? [],
    };

    const file = new File(Paths.cache, `giftwall-export-${Date.now()}.json`);
    file.create({ overwrite: true });
    file.write(JSON.stringify(payload, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Export your giftwall data",
      });
    }
  },

  // Permanently deletes the account via the delete-account Edge Function, then
  // clears the local session (which routes back to sign-in).
  async deleteAccount(): Promise<void> {
    const { error } = await supabase.functions.invoke("delete-account", {
      method: "POST",
    });
    if (error) throw error;
    await supabase.auth.signOut();
  },
};
