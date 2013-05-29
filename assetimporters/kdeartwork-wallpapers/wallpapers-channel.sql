
insert into channels values(default, 1, null, 'default/wallpaper.png', 'Wallpapers', 'Wallpapers', true, 0, null )
insert into storeChannels select c.last_value, 'VIVALDI-1' from seq_channelids c;

