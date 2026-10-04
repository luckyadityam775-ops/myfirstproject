-- ==============================================================================
-- ROYAL PALACE VIP BLACKJACK — SUPABASE DATABASE SCHEMA
-- Jalankan skrip ini di SQL Editor pada Dashboard Supabase Anda
-- ==============================================================================

-- 1. Tabel Profil Pemain & Saldo Cloud
create table if not exists public.blackjack_profiles (
    id text primary key,                     -- ID unik pemain (disimpan di browser/auth)
    username text not null default 'Pemain', -- Nama tampilan
    avatar text not null default '👑',       -- Emoji avatar
    bankroll bigint not null default 2500,   -- Saldo chip pemain
    rounds_played integer not null default 0,-- Total putaran
    wins integer not null default 0,         -- Total kemenangan
    losses integer not null default 0,       -- Total kekalahan
    pushes integer not null default 0,       -- Total seri
    blackjacks integer not null default 0,   -- Total natural blackjack
    best_streak integer not null default 0,  -- Kemenangan beruntun terbaik
    net_profit bigint not null default 0,    -- Total keuntungan bersih
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabel Riwayat Putaran / Log Permainan
create table if not exists public.blackjack_rounds (
    id uuid default gen_random_uuid() primary key,
    player_id text references public.blackjack_profiles(id) on delete cascade,
    player_name text not null,
    bet_amount integer not null,
    player_cards text not null,
    dealer_cards text not null,
    result text not null,                   -- 'WIN', 'LOSS', 'PUSH', 'BLACKJACK', 'SURRENDER'
    payout integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Aktifkan Row Level Security (RLS)
alter table public.blackjack_profiles enable row level security;
alter table public.blackjack_rounds enable row level security;

-- 4. Buat Kebijakan Akses Publik (Anon Key)
-- Mengizinkan pembacaan leaderboard dan data profil
create policy "Izinkan baca publik profiles"
    on public.blackjack_profiles for select
    using (true);

-- Mengizinkan simpan / update profil dari game klien
create policy "Izinkan simpan dan update profiles"
    on public.blackjack_profiles for all
    using (true)
    with check (true);

-- Mengizinkan pencatatan putaran
create policy "Izinkan simpan rounds log"
    on public.blackjack_rounds for insert
    with check (true);

create policy "Izinkan baca rounds log"
    on public.blackjack_rounds for select
    using (true);

-- 5. Aktifkan Fitur Supabase Realtime untuk Sinkronisasi Meja Multiplayer
alter publication supabase_realtime add table public.blackjack_profiles;
