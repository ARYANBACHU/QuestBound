truncate public.fellowships, public.serp_cache, auth.users cascade;
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222'),('33333333-3333-3333-3333-333333333333'),('44444444-4444-4444-4444-444444444444'),('55555555-5555-5555-5555-555555555555');
update public.profiles set display_name='Aria', crest='fox', color='rose', interests='{coffee,live_music,hiking}', budget='$' where id='11111111-1111-1111-1111-111111111111';
update public.profiles set display_name='Bram', crest='dragon', color='lagoon', interests='{board_games,coffee,pickup_sports}', budget='$' where id='22222222-2222-2222-2222-222222222222';
update public.profiles set display_name='Cleo', crest='swan', color='marigold', interests='{museums,photography,desserts}', budget='$$' where id='33333333-3333-3333-3333-333333333333';
update public.profiles set display_name='Dax', crest='wolf', color='fern', interests='{hiking,food_trucks,live_music}', budget='free' where id='44444444-4444-4444-4444-444444444444';
insert into public.fellowships (id, name, created_by, lat, lng, area_label) values ('aaaaaaaa-0000-0000-0000-000000000001','The Lantern Fellowship','11111111-1111-1111-1111-111111111111',30.2849,-97.7341,'Austin, TX');
insert into public.fellowship_members (fellowship_id, user_id, role) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','founder'),
 ('aaaaaaaa-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','member'),
 ('aaaaaaaa-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','member'),
 ('aaaaaaaa-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444','member');
