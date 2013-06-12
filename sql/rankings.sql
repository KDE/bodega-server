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
