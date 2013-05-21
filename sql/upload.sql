create table incomingAssets
(
    id          int         primary key default nextval('seq_assetsIds'),
    license     int         references licenses(id),
    author      int         references partners(id),
    basePrice   int         not null default 0 CHECK(basePrice >= 0),
    name        text        not null,
    description text,
    version     text        not null default '',
    versionTs   timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    path        text        not null,
    file        text        not null,
    image       text,
    publish     bool        not null default false
);

create table incomingAssetTags
(
    asset       int         references incomingAssets(id) on delete cascade,
    tag         int         references tags(id) on delete cascade
);

create table incomingAssetPreviews
(
    asset       int         references incomingAssets(id) on delete cascade,
    path        text
);
