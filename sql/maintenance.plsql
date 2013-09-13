/*
    Copyright 2013 Coherent Theory LLC

    This program is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License as
    published by the Free Software Foundation; either version 2 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/



CREATE OR REPLACE FUNCTION ct_frequentMaintenance() RETURNS VOID AS $$
BEGIN
    PERFORM ct_associateDirtyAssetsWithChannels();
    PERFORM ct_refreshChannels();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_dailyMaintenance() RETURNS VOID AS $$
BEGIN
    -- delete accounts that are not activated within one week
    DELETE FROM people WHERE activated IS NULL AND created < current_timestamp - '1 week'::interval;
END;
$$ LANGUAGE plpgsql;

