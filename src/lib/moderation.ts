// Shared report/block actions for user-generated content (App Store Guideline 1.2).
// Report flags content for operator review; Block hides a person's content from
// you (symmetric, enforced by RLS). Both surface as a native Alert action sheet.
import { Alert } from "react-native";
import { reportsRepo, type ReportContentType } from "@/data/repositories/reports";
import { blocksRepo } from "@/data/repositories/blocks";

type Notify = (message: string) => void;

// Report a piece of content, or block its author so you stop seeing their posts.
export function moderateContent(opts: {
  authorId: string;
  authorName: string | null;
  contentType: ReportContentType;
  contentId: string;
  groupId?: string | null;
  onChanged?: Notify; // message to toast after a report/block (caller also refetches)
}) {
  const name = opts.authorName?.trim() || "this person";
  Alert.alert(
    name,
    "Report this content for our team to review, or block them so you stop seeing what they post.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        onPress: async () => {
          try {
            await reportsRepo.report(opts.contentType, opts.contentId, { groupId: opts.groupId });
            opts.onChanged?.("Reported — thanks, we'll review it.");
          } catch (e) {
            opts.onChanged?.(String((e as Error).message) || "Couldn't report");
          }
        },
      },
      {
        text: `Block ${name}`,
        style: "destructive",
        onPress: async () => {
          try {
            await blocksRepo.block(opts.authorId);
            opts.onChanged?.("Blocked — you won't see their content anymore.");
          } catch (e) {
            opts.onChanged?.(String((e as Error).message) || "Couldn't block");
          }
        },
      },
    ],
  );
}

// Report-only (content with no single blockable author, e.g. a wishlist item).
export function confirmReport(
  contentType: ReportContentType,
  contentId: string,
  opts: { groupId?: string | null; onChanged?: Notify } = {},
) {
  Alert.alert("Report this?", "Our team will review it.", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Report",
      style: "destructive",
      onPress: async () => {
        try {
          await reportsRepo.report(contentType, contentId, { groupId: opts.groupId });
          opts.onChanged?.("Reported — thanks, we'll review it.");
        } catch (e) {
          opts.onChanged?.(String((e as Error).message) || "Couldn't report");
        }
      },
    },
  ]);
}

// Block a user directly (e.g. from the members list).
export function confirmBlock(userId: string, name: string | null, onChanged?: Notify) {
  const who = name?.trim() || "this person";
  Alert.alert(
    `Block ${who}?`,
    "You won't see their comments or group messages, and they won't see yours. You can unblock them in Profile.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            await blocksRepo.block(userId);
            onChanged?.(`Blocked ${who}.`);
          } catch (e) {
            onChanged?.(String((e as Error).message) || "Couldn't block");
          }
        },
      },
    ],
  );
}
