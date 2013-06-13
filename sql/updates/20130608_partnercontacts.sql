create table partnerBanking
(
    partner     int         not null references partners(id) on delete cascade,
    type        text        not null,
    name        text,
    account     text,
    swift       text,
    iban        text,
    address     text
);

create table partnerContactServices
(
    service     text        primary key,
    baseUrl     text
);

create table partnerContacts
(
    partner     int         not null references partners(id) on delete cascade,
    service     text        not null,
    account     text,
    url         text
);

