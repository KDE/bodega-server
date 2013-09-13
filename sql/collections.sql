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


-- drop table collections cascade;
create table collections
(
    id              serial      primary key,
    person          int         not null references people(id) on delete cascade,
    name            text        not null,
    public          bool        default false,
    type            text
);

-- drop table collectionsContent;
create table collectionsContent
(
    collection   int             not null references collections(id) on delete cascade,
    asset        int             not null references assets(id) on delete cascade,
    dateAdded    timestamp       not null default (current_timestamp AT TIME ZONE 'UTC')
);

-- drop table featuredCollections;
create table featuredCollections
(
    collection  int         not null references collections(id) on delete cascade,
    store      text        not null references stores(id) on delete cascade,
    channel     int         references channels(id) on delete cascade
);
