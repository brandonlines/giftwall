-- Birthdays → automatic occasions. A member's birthday is an opt-in date on
-- their profile that the rest of their groups get reminded about (handled by the
-- occasion-reminders Edge Function), so nobody has to create a wishlist event for
-- it. Not a secret — a birthday isn't a Surprise-Wall surface — so the existing
-- profile policies apply unchanged: you write only your own row; co-members read
-- it (row-level, so the new column rides along with the rest of the profile).

alter table public.profiles add column birthday date;
