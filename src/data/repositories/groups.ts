import { supabase, currentUserId } from "../../lib/supabase";
import type { EventType, Group, MemberRole, Membership } from "../../types/database";

export type MemberWithProfile = {
  user_id: string;
  role: MemberRole;
  displayName: string | null;
  avatarUrl: string | null;
};

// Repositories are the only place app code talks to Supabase. The UI depends on
// these interfaces, not on the SDK — so swapping in a cache/offline layer later
// is a change here, not across every screen.

export const groupsRepo = {
  async get(groupId: string): Promise<Group> {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();
    if (error) throw error;
    return data;
  },

  async listMine(): Promise<Group[]> {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(name: string, eventType: EventType = "general"): Promise<Group> {
    // Atomic: the create_group RPC inserts the group + the creator's admin
    // membership together (SECURITY DEFINER), so there's no half-created group
    // and no need for an open self-join policy.
    const { data, error } = await supabase.rpc("create_group", { p_name: name });
    if (error) throw error;
    const group = data as Group;
    if (eventType === "general") return group;
    // The creator is an admin, so RLS lets them set the event type.
    const { data: updated, error: uErr } = await supabase
      .from("groups")
      .update({ event_type: eventType })
      .eq("id", group.id)
      .select()
      .single();
    if (uErr) throw uErr;
    return updated;
  },

  async members(groupId: string): Promise<Membership[]> {
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("group_id", groupId);
    if (error) throw error;
    return data ?? [];
  },

  // memberships and profiles both FK to auth.users (not each other), so there's
  // no PostgREST relationship to embed — fetch both and merge. RLS lets a member
  // read co-members' profiles.
  async membersWithProfiles(groupId: string): Promise<MemberWithProfile[]> {
    const { data: members, error } = await supabase
      .from("memberships")
      .select("user_id, role")
      .eq("group_id", groupId);
    if (error) throw error;
    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) return [];

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    if (pErr) throw pErr;

    const byId = new Map(profiles?.map((p) => [p.id, p]));
    return (members ?? []).map((m) => {
      const p = byId.get(m.user_id);
      return {
        user_id: m.user_id,
        role: m.role,
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
      };
    });
  },

  async leave(groupId: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", uid);
    if (error) throw error;
  },

  // Admin-only (enforced by RLS): rename / delete the group.
  async rename(groupId: string, name: string): Promise<void> {
    const { error } = await supabase
      .from("groups")
      .update({ name })
      .eq("id", groupId);
    if (error) throw error;
  },

  async remove(groupId: string): Promise<void> {
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) throw error;
  },

  // Admin-only (enforced by RLS): remove another member.
  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  // Admin-only (enforced by RLS): promote/demote a member.
  async setMemberRole(
    groupId: string,
    userId: string,
    role: MemberRole,
  ): Promise<void> {
    const { error } = await supabase
      .from("memberships")
      .update({ role })
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  // Join via a shared invite code. Returns the group id on success.
  async joinByCode(code: string): Promise<string> {
    const { data, error } = await supabase.rpc("redeem_invite", {
      p_code: code.trim().toUpperCase(),
    });
    if (error) throw error;
    return data;
  },

  // Admin-only: revoke the current code and get a fresh one.
  async rotateInviteCode(groupId: string): Promise<string> {
    const { data, error } = await supabase.rpc("rotate_invite_code", {
      p_group_id: groupId,
    });
    if (error) throw error;
    return data;
  },
};
