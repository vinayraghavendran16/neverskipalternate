create function public.health_check() returns boolean language sql stable security definer set search_path='' as $$
 select true
$$;
revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon,authenticated;
comment on function public.health_check() is 'Zero-data database connectivity probe for the public application health endpoint.';
