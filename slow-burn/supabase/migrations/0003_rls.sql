-- Slow Burn — row level security.
--
-- Every table is deny-by-default. The client uses the anon key, so these
-- policies are the actual security boundary — not the app code.

alter table profiles         enable row level security;
alter table user_goals       enable row level security;
alter table reminder_settings enable row level security;
alter table habit_events     enable row level security;
alter table daily_summaries  enable row level security;
alter table circles          enable row level security;
alter table circle_members   enable row level security;
alter table nudges           enable row level security;
alter table push_tokens      enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — readable by you and by people who share a circle with you.
-- ---------------------------------------------------------------------------

create policy profiles_select_self_or_circle on profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_circle_with(id));

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert policy: profiles are created by the handle_new_user trigger only.
-- No delete policy: deleting the auth user cascades.

-- ---------------------------------------------------------------------------
-- user_goals / reminder_settings — strictly private. Body metrics, dietary
-- restrictions and daily routine never leave the owner.
-- ---------------------------------------------------------------------------

create policy user_goals_all_self on user_goals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reminder_settings_all_self on reminder_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- habit_events — private. A circle sees the aggregate, never the detail:
-- "Sam hit 80% today", not "Sam skipped lunch".
-- ---------------------------------------------------------------------------

create policy habit_events_all_self on habit_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- daily_summaries — the one cross-user read. Writes are trigger-only.
-- ---------------------------------------------------------------------------

create policy daily_summaries_select_self_or_circle on daily_summaries
  for select to authenticated
  using (user_id = auth.uid() or public.shares_circle_with(user_id));

-- Deliberately no insert/update/delete policy. recompute_daily_summary is
-- SECURITY DEFINER and is the only writer, so a client cannot fake a score.

-- ---------------------------------------------------------------------------
-- circles / circle_members — membership-gated via SECURITY DEFINER helpers,
-- which is what keeps these policies from recursing into themselves.
-- ---------------------------------------------------------------------------

create policy circles_select_member on circles
  for select to authenticated
  using (public.is_circle_member(id));

create policy circles_update_owner on circles
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy circles_delete_owner on circles
  for delete to authenticated
  using (owner_id = auth.uid());

-- No insert policy: create_circle() is the only way in, so every circle is
-- guaranteed to have exactly one owner row in circle_members.

create policy circle_members_select_same_circle on circle_members
  for select to authenticated
  using (public.is_circle_member(circle_id));

-- You may remove yourself from any circle; an owner may remove anyone.
create policy circle_members_delete_self_or_owner on circle_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_circle_owner(circle_id));

-- No insert policy: joining goes through join_circle_with_code(), which
-- enforces the size cap and validates the code.

-- ---------------------------------------------------------------------------
-- nudges — you can send to someone you share a circle with, and read what
-- you sent or received. No broadcast, no strangers.
-- ---------------------------------------------------------------------------

create policy nudges_select_participant on nudges
  for select to authenticated
  using (to_user_id = auth.uid() or from_user_id = auth.uid());

create policy nudges_insert_circle_peer on nudges
  for insert to authenticated
  with check (
    from_user_id = auth.uid()
    and public.is_circle_member(circle_id)
    and public.shares_circle_with(to_user_id)
  );

-- ---------------------------------------------------------------------------
-- push_tokens — device tokens are private to their owner.
-- ---------------------------------------------------------------------------

create policy push_tokens_all_self on push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Function grants. Revoke from anon so an unauthenticated key cannot probe
-- invite codes.
-- ---------------------------------------------------------------------------

revoke all on function public.join_circle_with_code(text) from public, anon;
revoke all on function public.create_circle(text) from public, anon;
revoke all on function public.circle_standings(uuid, date) from public, anon;
revoke all on function public.recompute_daily_summary(uuid, date) from public, anon, authenticated;

grant execute on function public.join_circle_with_code(text) to authenticated;
grant execute on function public.create_circle(text) to authenticated;
grant execute on function public.circle_standings(uuid, date) to authenticated;
grant execute on function public.is_circle_member(uuid) to authenticated;
grant execute on function public.is_circle_owner(uuid) to authenticated;
grant execute on function public.shares_circle_with(uuid) to authenticated;
