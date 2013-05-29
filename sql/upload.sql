create table incomingAssets
(
    id          int         primary key default nextval('seq_assetsIds'),
    license     int         references licenses(id),
    partner     int         references partners(id),
    basePrice   int         default 0 CHECK(basePrice >= 0),
    name        text,
    description text,
    version     text        default null,
    versionTs   timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    path        text,
    file        text        not null,
    image       text,
    publish     bool        not null default false
);

create type action as enum ('add', 'remove');

create table incomingAssetTags
(
    asset       int         references incomingAssets(id) on delete cascade,
    tag         int         references tags(id) on delete cascade,
    action      action      not null default 'add'
);

create table incomingAssetPreviews
(
    asset       int         references incomingAssets(id) on delete cascade,
    path        text,
    action      action      not null default 'add'
);

create table incomingAssetChangelogs
(
    asset       int         references assets(id) on delete cascade,
    version     text        not null,
    versionTs   timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    changes     text
);
