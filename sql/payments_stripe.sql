create table stripecustomers
(
    person        int     not null references people(id) on delete cascade,
    customerid    text    not null
);
