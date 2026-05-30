-- Let several people split a multi-quantity item ("4 dining chairs"), instead
-- of one claim per item. Rules:
--   * a user may hold at most one claim per item (unique item_id+buyer_id),
--   * total claims on an item may not exceed items.quantity (cap trigger).
-- The Surprise Wall is unaffected: the *count* is visible to non-recipient
-- members (who can already see the claims), and the recipient still sees none.

-- Was: unique (item_id) from migration 0001.
alter table public.claims drop constraint claims_item_id_key;
alter table public.claims add constraint claims_item_buyer_key unique (item_id, buyer_id);

-- Enforce the quantity cap. SECURITY DEFINER so the count is reliable
-- regardless of the inserting user's RLS view.
create or replace function public.enforce_claim_quantity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_qty   int;
  v_count int;
begin
  select quantity into v_qty from public.items where id = new.item_id;
  select count(*) into v_count from public.claims where item_id = new.item_id;
  if v_count >= coalesce(v_qty, 1) then
    raise exception 'This item is already fully claimed';
  end if;
  return new;
end;
$$;

create trigger claims_quantity_cap
  before insert on public.claims
  for each row execute function public.enforce_claim_quantity();
