create sequence seq_assetRatingsIds;

create table assetRatingAttributes
(
    id               int            primary key default nextval('seq_assetRatingsIds'),
    name             text           not null, -- e.g. 'Usability'
    lowDesc          text           not null, -- e.g. 'Very hard to use'
    highDesc         text           not null, -- e.g. 'Wonderfully designed'
    assetType        int            not null references tags(id) on delete cascade
);

create index assetRatingsAttributes_assetType on assetRatingAttributes(assetType);

create table assetRatings
(
    asset     int        not null references assets(id) on delete cascade,
    attribute int        not null references assetRatingAttributes(id) on delete cascade,
    person    int        not null references people(id) on delete cascade,
    rating    int        check (rating > 0 AND rating < 6),
    created   timestamp  not null default current_timestamp
);

create index assetratings_asset on assetRatings(asset);

create table assetRatingAverages
(
    asset     int        not null references assets(id) on delete cascade,
    attribute int        not null references assetRatingAttributes(id) on delete cascade,
    rating    float      not null check (rating > 0 AND rating < 6),
    ratingsCount int     not null
);

create index assetRatingAverages_asset on assetRatingAverages(asset);

