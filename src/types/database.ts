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
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          shipping_address: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          shipping_address?: string | null;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          shipping_address?: string | null;
        };
        Relationships: [];
      };
      groups: {
        Row: { id: string; name: string; created_by: string | null; invite_code: string; event_type: EventType; background_url: string | null; created_at: string };
        Insert: { id?: string; name: string; created_by: string; event_type?: EventType };
        Update: { name?: string; event_type?: EventType; background_url?: string | null };
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
          recurs_yearly: boolean;
          reveal_requested: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          owner_id: string;
          title: string;
          event_date?: string | null;
          recurs_yearly?: boolean;
        };
        Update: {
          title?: string;
          event_date?: string | null;
          recurs_yearly?: boolean;
          reveal_requested?: boolean;
        };
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
          position: number | null;
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
          position?: number | null;
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
          position?: number | null;
        };
        Relationships: [];
      };
      claims: {
        Row: {
          id: string;
          item_id: string;
          buyer_id: string;
          status: ClaimStatus;
          revealed: boolean;
          created_at: string;
        };
        Insert: { id?: string; item_id: string; buyer_id: string; status?: ClaimStatus };
        Update: { status?: ClaimStatus; revealed?: boolean };
        Relationships: [];
      };
      contributions: {
        Row: {
          id: string;
          item_id: string;
          contributor_id: string;
          amount_cents: number;
          note: string | null;
          revealed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          contributor_id: string;
          amount_cents: number;
          note?: string | null;
        };
        Update: { amount_cents?: number; note?: string | null; revealed?: boolean };
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
      santa_exclusions: {
        Row: { group_id: string; user_a: string; user_b: string; created_at: string };
        Insert: { group_id: string; user_a: string; user_b: string };
        Update: { user_a?: string; user_b?: string };
        Relationships: [];
      };
      push_tokens: {
        Row: { token: string; user_id: string; platform: string | null; updated_at: string };
        Insert: { token: string; user_id: string; platform?: string | null };
        Update: { platform?: string | null };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          new_item: boolean;
          new_comment: boolean;
          occasion_reminder: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          new_item?: boolean;
          new_comment?: boolean;
          occasion_reminder?: boolean;
        };
        Update: { new_item?: boolean; new_comment?: boolean; occasion_reminder?: boolean };
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
      thank_yous: {
        Row: {
          item_id: string;
          from_id: string;
          to_id: string;
          message: string;
          created_at: string;
        };
        Insert: { item_id: string; from_id: string; to_id: string; message: string };
        Update: { message?: string };
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
      set_group_background: { Args: { p_group_id: string; p_url: string | null }; Returns: undefined };
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
export type SantaExclusion = T["santa_exclusions"]["Row"];
export type PushToken = T["push_tokens"]["Row"];
export type NotificationPrefs = T["notification_preferences"]["Row"];
export type Activity = T["activity"]["Row"];
export type ItemComment = T["item_comments"]["Row"];
export type ThankYou = T["thank_yous"]["Row"];
