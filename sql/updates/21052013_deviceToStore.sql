alter table deviceChannels rename to storeChannels;
alter table storeChannels rename device to store;
alter table assetPrices rename device to store;
alter table downloads rename device to store;
alter table easterEggs rename device to store;
alter table purchases rename device to store;
alter table devices rename partnumber to id;

drop function ct_assetPrice(fromDevice text, what int);
drop function ct_purchase(who int, fromDevice text, what int);
drop function ct_canDownload(who int, fromDevice text, what int)
drop function ct_recordDownload(who int, what int, fromWhere inet, device text)
\i ../purchasing.plsql

\i ../core.plsql
