-- 1. Main tournament table
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users not null,
  name text not null,
  location text,
  date date,
  format text check (format in ('pools', 'elimination', 'championship')) default 'pools',
  points_per_set int default 25,
  sets_to_win int default 2,
  public_registration bool default true,
  player_scoring bool default false,
  strict_validation bool default false,
  status text check (status in ('draft', 'open', 'in_progress', 'finished')) default 'open',
  join_token text unique default encode(extensions.gen_random_bytes(12), 'hex'),
  spectator_token text unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Teams registered in a tournament
create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments on delete cascade not null,
  name text not null,
  captain_id uuid references auth.users,
  created_at timestamptz default now()
);

-- 3. Members of each team
create table if not exists public.tournament_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.tournament_teams on delete cascade not null,
  tournament_id uuid references public.tournaments on delete cascade not null,
  user_id uuid references auth.users not null,
  player_name text,
  role text default 'member',
  created_at timestamptz default now(),
  unique(team_id, user_id)
);

-- 4. Matches within the tournament
create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments on delete cascade not null,
  team_blue_id uuid references public.tournament_teams,
  team_red_id uuid references public.tournament_teams,
  score_blue int[] default '{}',
  score_red int[] default '{}',
  winner_id uuid references public.tournament_teams,
  status text check (status in ('pending', 'in_progress', 'finished', 'locked')) default 'pending',
  round int default 1,
  match_ref text,
  updated_at timestamptz default now()
);

-- RLS
alter table public.tournaments enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.tournament_members enable row level security;
alter table public.tournament_matches enable row level security;

-- TOURNAMENTS
create policy "tournaments_select_public" on public.tournaments for select using (true);
create policy "tournaments_update_owner" on public.tournaments for update using (auth.uid() = created_by);
create policy "tournaments_delete_owner" on public.tournaments for delete using (auth.uid() = created_by);
create policy "tournaments_insert_auth" on public.tournaments for insert with check (auth.uid() = created_by);

-- TOURNAMENT_TEAMS
create policy "teams_select_public" on public.tournament_teams for select using (true);
create policy "teams_insert_auth" on public.tournament_teams for insert with check (auth.uid() is not null);
create policy "teams_update_captain_or_admin" on public.tournament_teams for update using (
  auth.uid() = captain_id or
  auth.uid() = (select created_by from public.tournaments where id = tournament_id)
);

-- TOURNAMENT_MEMBERS
create policy "members_select_public" on public.tournament_members for select using (true);
create policy "members_insert_auth" on public.tournament_members for insert with check (auth.uid() = user_id);
create policy "members_update_self_or_admin" on public.tournament_members for update using (
  auth.uid() = user_id or
  auth.uid() = (select created_by from public.tournaments where id = tournament_id)
);
create policy "members_delete_self_or_admin" on public.tournament_members for delete using (
  auth.uid() = user_id or
  auth.uid() = (select created_by from public.tournaments where id = tournament_id)
);

-- TOURNAMENT_MATCHES
create policy "matches_select_public" on public.tournament_matches for select using (true);
create policy "matches_insert_admin" on public.tournament_matches for insert with check (
  auth.uid() = (select created_by from public.tournaments where id = tournament_id)
);
create policy "matches_update_admin_or_player" on public.tournament_matches for update using (
  auth.uid() = (select created_by from public.tournaments where id = tournament_id)
  or
  (
    (select player_scoring from public.tournaments where id = tournament_id) = true and
    (select strict_validation from public.tournaments where id = tournament_id) = false and
    auth.uid() in (
      select user_id from public.tournament_members where tournament_id = tournament_matches.tournament_id
    )
  )
);
create policy "matches_delete_admin" on public.tournament_matches for delete using (
  auth.uid() = (select created_by from public.tournaments where id = tournament_id)
);

-- Enable realtime for live scores
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;