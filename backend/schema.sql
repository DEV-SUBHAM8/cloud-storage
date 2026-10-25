create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

create table folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  name text not null,
  mime_type text,
  size bigint not null default 0,
  storage_path text not null,
  status text not null default 'pending',
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table shares (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer','editor')),
  created_at timestamptz not null default now(),
  unique (resource_type, resource_id, shared_with)
);

create table link_shares (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  token text unique not null,
  password_hash text,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table stars (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  primary key (user_id, resource_type, resource_id)
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  resource_type text,
  resource_id uuid,
  created_at timestamptz not null default now()
);

create index on folders (owner_id, parent_id);
create index on files (owner_id, folder_id);
create index on files (name);
create index on folders (name);
create index on shares (shared_with);
create index on shares (resource_id);

alter table profiles enable row level security;
alter table folders enable row level security;
alter table files enable row level security;
alter table shares enable row level security;
alter table link_shares enable row level security;
alter table stars enable row level security;
alter table activities enable row level security;
