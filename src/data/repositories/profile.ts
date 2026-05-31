import { decode } from "base64-arraybuffer";
import { supabase, currentUserId } from "../../lib/supabase";
import type { Profile } from "../../types/database";

export const profileRepo = {
  async getMine(): Promise<Profile | null> {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async setDisplayName(displayName: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: uid, display_name: displayName });
    if (error) throw error;
  },

  // Optional — visible to group co-members so they can ship gifts. Empty saves
  // as NULL (cleared). RLS lets you write only your own row.
  async setShippingAddress(address: string | null): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: uid, shipping_address: address?.trim() ? address.trim() : null });
    if (error) throw error;
  },

  // Uploads a base64 image (from the picker) to the user's own storage folder,
  // saves the public URL on the profile, and returns it. A cache-busting query
  // param forces clients to refetch after an overwrite at the same path.
  async uploadAvatar(base64: string, mimeType = "image/jpeg"): Promise<string> {
    const uid = await currentUserId();
    const ext = mimeType.split("/")[1] ?? "jpg";
    const path = `${uid}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, decode(base64), { contentType: mimeType, upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: uid, avatar_url: url });
    if (error) throw error;
    return url;
  },
};
