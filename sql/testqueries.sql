
-- matching assets with channels on asset tag change
insert into assettags (asset, tag) values (1, 3);
select count(asset) = 1 from channelassets group by asset;
delete from assettags where tag = 3;
select count(asset) = 0 from channelassets group by asset;


-- matching channels with assets on channel asset change
delete from channeltags where channel = 2 and tag = 4;
select * from channelassets;
insert into channeltags (channel, tag) values (2, 4);
select * from channelassets;

