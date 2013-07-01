create sequence seq_ratingsIds;

create table ratingAttributes
(
    id               int            primary key default nextval('seq_ratingsIds'),
    name             text           not null, -- e.g. 'Usability'
    lowDesc          text           not null, -- e.g. 'Very hard to use'
    highDesc         text           not null, -- e.g. 'Wonderfully designed'
    assetType        int            not null references tags(id) on delete cascade
);

create table ratings
(
    asset     int        not null references assets(id) on delete cascade,
    attribute int        not null references ratingAttributes(id) on delete cascade,
    person    int        not null references people(id) on delete cascade,
    rating    int        check (rating > 0 AND rating < 6)
);

create table assetRatingAverages
(
    asset     int        not null references assets(id) on delete cascade,
    attribute int        not null references ratingAttributes(id) on delete cascade,
    rating    float      not null check (rating > 0 AND rating < 6)
);

