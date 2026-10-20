-- O trigger de criação de perfil não deve ser chamável via /rest/v1/rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
