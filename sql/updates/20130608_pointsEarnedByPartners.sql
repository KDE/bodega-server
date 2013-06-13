alter table people drop column owedPoints;
alter table people drop column earnedpoints;

alter table partners add column earnedPoints int not null default 0 constraint ct_personEarnedPoints check (earnedPoints > -1);
alter table partners add column owedPoints int not null default 0 constraint ct_personOwedPoints check (owedPoints> -1);


