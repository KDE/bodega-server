-- drop table collections cascade;
create table collections
(
    id              serial      primary key,
    person          int         not null references people(id) on delete cascade,
    name            text        not null,
    public          bool        default false,
    wishlist        bool        default false -- means assets in it haven't been bought
);

-- drop table collectionsContent;
create table collectionsContent
(
   collection   int             not null references collections(id) on delete cascade,
   asset        int             not null references assets(id) on delete cascade,
   dateAdded    timestamp       not null default (current_timestamp AT TIME ZONE 'UTC')
);
