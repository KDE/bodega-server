create table warehouses
(
    id          text        primary key,
    minMarkup   int         not null default 0 check (minMarkup >= 0),
    maxMarkup   int         not null default 0 check (maxMarkup >= minMarkup),
    flatMarkup  bool        not null default true,
    markup      int         not null default 0 check (not flatMarkup or (markup >= minMarkup and (maxMarkup = 0 or markup <= maxMarkup)))
);

ALTER TABLE stores DROP COLUMN flatMarkup;
DROP FUNCTION ct_calcPoints(points int, flatMarkup bool, markup int, minMarkup int, maxMarkup int);
\i core.plsql
INSERT INTO warehouses VALUES ('main', 15, 10000, false, 15);
