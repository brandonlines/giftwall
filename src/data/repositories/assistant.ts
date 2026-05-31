import { supabase } from "../../lib/supabase";

export type GiftIdea = { title: string; why: string; estPrice: string };

export type AssistantInput = {
  relationship?: string;
  age?: string;
  interests?: string;
  occasion?: string;
  budget?: string;
  notes?: string;
};

export const assistantRepo = {
  // Calls the gift-assistant Edge Function. On a non-2xx the function returns a
  // friendly { error } body — surface that message rather than the generic
  // "Edge Function returned a non-2xx status code".
  async suggest(input: AssistantInput): Promise<GiftIdea[]> {
    const { data, error } = await supabase.functions.invoke<{ ideas: GiftIdea[] }>(
      "gift-assistant",
      { body: input },
    );
    if (error) {
      let message = error.message;
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          if (body?.error) message = body.error;
        } catch {
          // keep the default message
        }
      }
      throw new Error(message);
    }
    return data?.ideas ?? [];
  },
};
