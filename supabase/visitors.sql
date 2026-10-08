-- 오늘의 멍운세: 방문자 수 집계 (Supabase SQL Editor에서 한 번 실행)
-- 개인정보는 저장하지 않고, 날짜별 방문 횟수 숫자만 저장해요.

-- 1) 날짜별 방문 수 표
create table if not exists public.meong_visits (
  day   date primary key,
  count integer not null default 0
);

-- 2) 표는 바깥에서 직접 읽거나 고칠 수 없게 잠금 (아래 함수로만 접근)
alter table public.meong_visits enable row level security;

-- 3) 방문 기록 + 오늘/누적 숫자 돌려주는 함수
--    p_new = true  : 오늘 처음 온 방문자 → 1 더하고 숫자 돌려줌
--    p_new = false : 이미 오늘 왔던 방문자 → 숫자만 돌려줌
create or replace function public.meong_visit(p_new boolean default true)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  d   date := (now() at time zone 'Asia/Seoul')::date;
  t   integer;
  tot bigint;
begin
  if p_new then
    insert into public.meong_visits(day, count) values (d, 1)
    on conflict (day) do update set count = public.meong_visits.count + 1;
  end if;
  select coalesce((select count from public.meong_visits where day = d), 0) into t;
  select coalesce(sum(count), 0) into tot from public.meong_visits;
  return json_build_object('today', t, 'total', tot);
end;
$$;

revoke all on function public.meong_visit(boolean) from public;
grant execute on function public.meong_visit(boolean) to anon, authenticated;
