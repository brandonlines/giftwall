import { supabase, currentUserId } from "../../lib/supabase";

export type ItemHit = {
  id: string;
  title: string;
  listId: string;
  listTitle: string | null;
  isMine: boolean; // the matched item is on the searcher's own list
  imageUrl: string | null;
};

export type PersonHit = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type SearchResults = { items: ItemHit[]; people: PersonHit[] };

// Escapes the LIKE wildcards so a user typing "50%" or "a_b" searches literally.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Searches items and people across every group the user belongs to. RLS scopes
// both queries automatically — items only from the user's groups, profiles only
// for co-members — so there's nothing to filter client-side.
export const searchRepo = {
  async query(text: string): Promise<SearchResults> {
    const q = text.trim();
    if (q.length < 2) return { items: [], people: [] };
    const uid = await currentUserId();
    const pattern = `%${escapeLike(q)}%`;

    const [{ data: items, error: iErr }, { data: people, error: pErr }] = await Promise.all([
      supabase
        .from("items")
        .select("id, title, list_id, image_url")
        .ilike("title", pattern)
        .limit(40),
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .ilike("display_name", pattern)
        .limit(20),
    ]);
    if (iErr) throw iErr;
    if (pErr) throw pErr;

    // Resolve each matched item's list (title + owner) in one follow-up query.
    const listIds = [...new Set((items ?? []).map((i) => i.list_id))];
    const listInfo = new Map<string, { title: string; owner_id: string }>();
    if (listIds.length > 0) {
      const { data: lists, error: lErr } = await supabase
        .from("wishlists")
        .select("id, title, owner_id")
        .in("id", listIds);
      if (lErr) throw lErr;
      for (const l of lists ?? []) listInfo.set(l.id, { title: l.title, owner_id: l.owner_id });
    }

    return {
      items: (items ?? []).map((i) => {
        const info = listInfo.get(i.list_id);
        return {
          id: i.id,
          title: i.title,
          listId: i.list_id,
          listTitle: info?.title ?? null,
          isMine: info?.owner_id === uid,
          imageUrl: i.image_url,
        };
      }),
      people: (people ?? [])
        .filter((p) => p.id !== uid)
        .map((p) => ({ id: p.id, name: p.display_name ?? "Unnamed", avatarUrl: p.avatar_url })),
    };
  },
};
