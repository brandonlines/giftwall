-- Stream comments and activity over Realtime. RLS is enforced on these feeds
-- (same policies as SELECT), so the Surprise Wall holds: a recipient never
-- receives comment events for items on their own list, and the activity feed
-- never carries claims. (claims + items were added to the publication in 0001.)

alter publication supabase_realtime add table public.item_comments;
alter publication supabase_realtime add table public.activity;
