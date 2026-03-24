-- Marketing CRM schema
-- Run via Supabase SQL Editor or as a migration

-- ── Contacts ────────────────────────────────────────────────

create table marketing_contacts (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  handle_ig       text,
  handle_tiktok   text,
  segment         text        not null check (segment in ('player', 'coach', 'club')),
  source          text,
  status          text        default 'new' check (status in ('new', 'contacted', 'replied', 'converted', 'ignored')),
  city            text,
  club_name       text,
  followers_count integer,
  bio             text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Interactions ────────────────────────────────────────────

create table marketing_interactions (
  id           uuid        primary key default gen_random_uuid(),
  contact_id   uuid        not null references marketing_contacts(id) on delete cascade,
  platform     text        not null check (platform in ('instagram', 'tiktok')),
  type         text        not null check (type in ('dm', 'comment', 'follow', 'like', 'mention')),
  message_sent text,
  response     text,
  sent_at      timestamptz default now(),
  responded_at timestamptz
);

-- ── Content ─────────────────────────────────────────────────

create table marketing_content (
  id                  uuid        primary key default gen_random_uuid(),
  content_type        text        not null check (content_type in ('tip', 'feature_showcase', 'stats_highlight', 'behind_the_scenes', 'community')),
  segment             text        not null check (segment in ('player', 'coach', 'club', 'all')),
  title               text        not null,
  body                text        not null,
  caption             text,
  media_url           text,
  platform            text        check (platform in ('instagram', 'tiktok', 'both')),
  status              text        default 'draft' check (status in ('draft', 'scheduled', 'published')),
  scheduled_at        timestamptz,
  published_at        timestamptz,
  engagement_likes    integer     default 0,
  engagement_comments integer     default 0,
  engagement_shares   integer     default 0,
  created_at          timestamptz default now()
);

-- ── Indexes ─────────────────────────────────────────────────

create index idx_contacts_segment  on marketing_contacts(segment);
create index idx_contacts_status   on marketing_contacts(status);
create index idx_content_scheduled on marketing_content(status, scheduled_at);

-- ── updated_at trigger ──────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_contacts_updated_at
  before update on marketing_contacts
  for each row execute function set_updated_at();
