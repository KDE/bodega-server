/*
    Copyright 2013 Coherent Theory LLC

    This program is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License as
    published by the Free Software Foundation; either version 2 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/



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

