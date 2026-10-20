-- Login por nome + senha (sem e-mail). A conta é criada pela Edge Function `signup`,
-- que guarda o nome digitado em raw_user_meta_data.username.

-- O nome de login aceita qualquer caractere, de 1 a 24.
alter table public.profiles drop constraint profiles_username_check;
alter table public.profiles add constraint profiles_username_check
  check (char_length(username) between 1 and 24);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
      'aventureiro_' || substr(replace(new.id::text, '-', ''), 1, 6)
    )
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
