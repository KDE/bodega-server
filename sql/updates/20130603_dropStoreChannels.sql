alter table channels add column store text;
update channels c set store = sc.store from storechannels sc where sc.channel = c.id;
update channels c set store = p.store from channels p where p.id = c.parent;
alter table channels alter column store set not null;
drop table storeChannels;
\i core.plsql
\i purchasing.plsql
