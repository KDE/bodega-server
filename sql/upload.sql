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


create table incomingAssets
(
    id          int         primary key default nextval('seq_assetsIds'),
    license     int         references licenses(id),
    partner     int         references partners(id) on delete cascade,
    basePrice   int         default 0 CHECK(basePrice >= 0),
    name        text,
    description text,
    version     text        default null,
    versionTs   timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    externPath  text,
    file        text        not null,
    size        int         default 0 not null,
    image       text,
    posted      bool        not null default false
);

create index idx_incomingasset_names on incomingAssets (name);
create index idx_incomingasset_partners on incomingAssets (partner);

create table incomingAssetTags
(
    asset       int         references incomingAssets(id) on delete cascade,
    tag         int         references tags(id) on delete cascade
);
create index idx_incomingAssetTags_byAsset on incomingAssettags(asset);
create index idx_incomingAssetTags_byTag on incomingAssettags(tag);

create table incomingAssetPreviews
(
    asset       int         references incomingAssets(id) on delete cascade,
    path        text        not null,
    mimetype    text        not null,
    type        text        not null,
    subtype     text        not null
);
create index idx_incomingAssetPreviews_byAsset on incomingAssetPreviews(asset);

create table incomingAssetChangelogs
(
    asset       int         references assets(id) on delete cascade,
    version     text        not null,
    versionTs   timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    changes     text
);
create index idx_incomingAssetChangelogs_byAsset on incomingAssetChangelogs(asset);
