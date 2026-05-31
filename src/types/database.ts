// Hand-authored to match supabase/migrations/0001_init.sql.
// Once your Supabase project is live, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type ClaimStatus = "claimed" | "purchased";
export type MemberRole = "admin" | "member";
export type ActivityType = "member_joined" | "list_created" | "item_added";
export type EventType = "general" | "christmas" | "secret_santa" | "birthday" | "gift_shower";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null; created_at: string };
        Insert: { id: string; display_name?: string | null; avatar_url?: string | null };
        Update: { display_name?: string | null; avatar_url?: string | null };
        Relationships: [];
      };
      groups: {
        Row: { id: string; name: string; created_by: string | null; invite_code: string; event_type: EventType; created_at: string };
        Insert: { id?: string; name: string; created_by: string; event_type?: EventType };
        Update: { name?: string; event_type?: EventType };
        Relationships: [];
      };
      memberships: {
        Row: { group_id: string; user_id: string; role: MemberRole; created_at: string };
        Insert: { group_id: string; user_id: string; role?: MemberRole };
        Update: { role?: MemberRole };
        Relationships: [];
      };
      wishlists: {
        Row: {
          id: string;
          group_id: string;
          owner_id: string;
          title: string;
          event_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          owner_id: string;
          title: string;
          event_date?: string | null;
        };
        Update: { title?: string; event_date?: string | null };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          list_id: string;
          title: string;
          url: string | null;
          image_url: string | null;
          price_cents: number | null;
          currency: string | null;
          note: string | null;
          quantity: number;
          is_priority: boolean;
          is_group_gift: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          title: string;
          url?: string | null;
          image_url?: string | null;
          price_cents?: number | null;
          currency?: string | null;
          note?: string | null;
          quantity?: number;
          is_priority?: boolean;
          is_group_gift?: boolean;
        };
        Update: {
          title?: string;
          url?: string | null;
          image_url?: string | null;
          price_cents?: number | null;
          currency?: string | null;
          note?: string | null;
          quantity?: number;
          is_priority?: boolean;
          is_group_gift?: boolean;
        };
        Relationships: [];
      };
      claims: {
        Row: {
          id: string;
          item_id: string;
          buyer_id: string;
          status: ClaimStatus;
          created_at: string;
        };
        Insert: { id?: string; item_id: string; buyer_id: string; status?: ClaimStatus };
        Update: { status?: ClaimStatus };
        Relationships: [];
      };
      contributions: {
        Row: {
          id: string;
          item_id: string;
          contributor_id: string;
          amount_cents: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          contributor_id: string;
          amount_cents: number;
          note?: string | null;
        };
        Update: { amount_cents?: number; note?: string | null };
        Relationships: [];
      };
      reactions: {
        Row: { item_id: string; user_id: string; emoji: string; created_at: string };
        Insert: { item_id: string; user_id: string; emoji: string };
        Update: { emoji?: string };
        Relationships: [];
      };
      santa_assignments: {
        Row: { group_id: string; giver_id: string; receiver_id: string; created_at: string };
        Insert: { group_id: string; giver_id: string; receiver_id: string };
        Update: { receiver_id?: string };
        Relationships: [];
      };
      push_tokens: {
        Row: { token: string; user_id: string; platform: string | null; updated_at: string };
        Insert: { token: string; user_id: string; platform?: string | null };
        Update: { platform?: string | null };
        Relationships: [];
      };
      item_comments: {
        Row: {
          id: string;
          item_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: { id?: string; item_id: string; author_id: string; body: string };
        Update: { body?: string };
        Relationships: [];
      };
      activity: {
        Row: {
          id: string;
          group_id: string;
          actor_id: string | null;
          type: ActivityType;
          list_id: string | null;
          list_title: string | null;
          item_title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          actor_id?: string | null;
          type: ActivityType;
          list_id?: string | null;
          list_title?: string | null;
          item_title?: string | null;
        };
        Update: { list_title?: string | null; item_title?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_group: {
        Args: { p_name: string };
        Returns: {
          id: string;
          name: string;
          created_by: string | null;
          invite_code: string;
          created_at: string;
        };
      };
      redeem_invite: { Args: { p_code: string }; Returns: string };
      rotate_invite_code: { Args: { p_group_id: string }; Returns: string };
      draw_secret_santa: { Args: { p_group_id: string }; Returns: undefined };
      santa_is_drawn: { Args: { p_group_id: string }; Returns: boolean };
    };
    Enums: {
      claim_status: ClaimStatus;
      member_role: MemberRole;
      activity_type: ActivityType;
    };
  };
}

// Convenience row aliases for app code.
type T = Database["public"]["Tables"];
export type Profile = T["profiles"]["Row"];
export type Group = T["groups"]["Row"];
export type Membership = T["memberships"]["Row"];
export type Wishlist = T["wishlists"]["Row"];
export type Item = T["items"]["Row"];
export type Claim = T["claims"]["Row"];
export type Contribution = T["contributions"]["Row"];
export type Reaction = T["reactions"]["Row"];
export type SantaAssignment = T["santa_assignments"]["Row"];
export type PushToken = T["push_tokens"]["Row"];
export type Activity = T["activity"]["Row"];
export type ItemComment = T["item_comments"]["Row"];
