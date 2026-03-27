-- ============================================================
--  ZENITH TUTORIAL — SUPABASE DATABASE SETUP
--  Run this SQL in: Supabase Dashboard → SQL Editor → New Query
--  Then click "Run"
-- ============================================================

-- 1. STUDENTS TABLE
create table students (
  id                 uuid default gen_random_uuid() primary key,
  name               text not null,
  name_lower         text,
  class              text,
  total_fee          numeric default 0,
  amount_paid        numeric default 0,
  balance            numeric default 0,
  payment_method     text,
  status             text default 'partial',  -- 'paid' or 'partial'
  serial             text,
  serial_active      boolean default false,
  photo_url          text,
  notes              text,
  enrollment_date    date,
  first_payment_date date,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- 2. PAYMENTS TABLE (payment history per student)
create table payments (
  id           uuid default gen_random_uuid() primary key,
  student_id   uuid references students(id) on delete cascade,
  amount       numeric not null,
  method       text,
  payment_date date,
  created_at   timestamptz default now()
);

-- 3. SERIAL HISTORY TABLE (tracks regenerated serials)
create table serial_history (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references students(id) on delete cascade,
  old_serial  text,
  new_serial  text,
  revoked_at  timestamptz default now()
);

-- 4. AUTO-UPDATE updated_at on students
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger students_updated_at
  before update on students
  for each row execute function update_updated_at();

-- 5. ROW LEVEL SECURITY — Only logged-in admin can access data
alter table students       enable row level security;
alter table payments       enable row level security;
alter table serial_history enable row level security;

create policy "Allow authenticated users" on students
  for all using (auth.role() = 'authenticated');

create policy "Allow authenticated users" on payments
  for all using (auth.role() = 'authenticated');

create policy "Allow authenticated users" on serial_history
  for all using (auth.role() = 'authenticated');
