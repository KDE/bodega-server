--drop table ratings;

create sequence seq_ratingsIds;

create table ratings
(
    id               int            primary key default nextval('seq_ratingsIds'),
    description      varchar(80)    not null, -- like awesome book, good book, bad book
    value            int            not null, -- a numeric value from 1-5.
    tag              int            not null references tags(id) on delete cascade -- the id of the tag with which this rating is accosiated with
);

--drop table ratingsContent;
create table ratingsContent
(
    asset     int        not null references assets(id) on delete cascade,
    rating    int        not null references ratings(id) on delete cascade,
    person    int        not null references people(id) on delete cascade
);

