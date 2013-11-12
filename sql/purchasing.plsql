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

CREATE OR REPLACE FUNCTION ct_assetPrice(fromStore text, what int,
                                         OUT retailPoints int,
                                         OUT toDistributorPoints int, OUT toPublisherPoints int,
                                         OUT distributor int, OUT publisher int,
                                         OUT assetName text) AS $$
DECLARE
BEGIN
    SELECT INTO retailPoints, toDistributorPoints, toPublisherPoints, distributor, publisher, assetName
        ap.points, ap.toStore, a.basePrice, s.partner, a.partner, a.name
            FROM assetPrices ap JOIN assets a ON (ap.asset = a.id)
                                JOIN stores s ON (ap.store = s.id)
                             WHERE ap.asset = what AND ap.store = fromStore AND
                                   ap.starting <= (current_timestamp AT TIME ZONE 'UTC') AND
                                   (ap.ending IS NULL OR ap.ending >= current_timestamp AT TIME ZONE 'UTC')
                            ORDER BY ap.starting DESC LIMIT 1;
    IF NOT FOUND THEN
        SELECT INTO retailPoints, toDistributorPoints, toPublisherPoints, distributor, publisher, assetName
            0, 0, 0, st.partner, a.partner, a.name
            FROM subChannelAssets sca JOIN channels c ON (sca.channel = c.id)
                                      JOIN stores st ON (c.store = st.id)
                                      JOIN assets a ON (sca.asset = a.id)
                 WHERE sca.asset = what AND c.parent IS NULL AND c.store = fromStore LIMIT 1;
        IF NOT FOUND THEN
            retailPoints := -1;
        END IF;
    END IF;
END;
$$ LANGUAGE 'plpgsql';

-- try to purchase
-- PARAMETERS: int person, int asset
-- RETURNS:
--          0 on success
--          1 if the requested asset is not available for purchase
--          2 if the purchaser account was not found
--          3 if not enough points
CREATE OR REPLACE FUNCTION ct_purchase(who int, fromStore text, what int) RETURNS INT AS $$
DECLARE
    pricing   RECORD;
    purchaserEmail   text;
BEGIN
    PERFORM * FROM purchases WHERE person = who AND asset = what;
    IF FOUND THEN
        -- already purchased!
        RETURN 0;
    END IF;

    SELECT INTO pricing * FROM ct_assetPrice(fromStore, what);
    IF pricing.retailPoints < 0 THEN
        RETURN 1;
    ELSIF pricing.retailPoints < 1 THEN
        -- the item does not cost anything, so just return here
        RETURN 0;
    END IF;

    SELECT INTO purchaserEmail email FROM people WHERE id = who;
    IF NOT FOUND THEN
        RETURN 2;
    END IF;

    -- note that to avoid problems with multiple simultaneous sales, which can happen
    -- concurrently, the update must be done in an atomic fashion.
    UPDATE people SET points = points - pricing.retailPoints WHERE id = who AND points >= pricing.retailPoints;
    IF NOT FOUND THEN
        RETURN 3;
    END IF;

    -- distribute the earnings!
    -- credit the publisher
    UPDATE partners SET earnedPoints = earnedPoints + pricing.toPublisherPoints,
                        owedPoints = owedPoints + pricing.toPublisherPoints
        WHERE id = pricing.publisher;
    -- credit the distributor
    UPDATE partners SET earnedPoints = earnedPoints + pricing.toDistributorPoints,
                        owedPoints = owedPoints + pricing.toDistributorPoints
        WHERE id = pricing.distributor;

    -- insert into the purchases recording table
    INSERT INTO purchases (person, email, store, asset, name, points, toParticipant, toStore)
                   VALUES (who, purchaserEmail, fromStore, what, pricing.assetName,
                           pricing.retailPoints, pricing.toPublisherPoints, pricing.toDistributorPoints);
    RETURN 0;
END;
$$ LANGUAGE 'plpgsql';

-- check if download is allowed
-- PARAMETERS: int person, int asset
-- RETURNS: bool true if can download, false if not
CREATE OR REPLACE FUNCTION ct_canDownload(who int, fromStore text, what int) RETURNS BOOL AS $$
DECLARE
    pricing RECORD;
    channel int := 0;
BEGIN
    PERFORM * FROM purchases WHERE person = who AND asset = what;
    IF NOT FOUND THEN
        -- you can always download your own stuff
        PERFORM * FROM assets WHERE id = what AND partner = who;
        IF FOUND THEN
            RETURN TRUE;
        END IF;

        -- you can always download things as superuser validator
        IF ct_isSuperuserValidator(who) THEN
            RETURN TRUE;
        END IF;

        SELECT INTO pricing * FROM ct_assetPrice(fromStore, what);
        IF pricing.retailPoints != 0 THEN
            -- either doesn't exist or hasn't been purchased
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE 'plpgsql';


-- check if download of an incoming asset is allowed
--   it is but only for superusers and owners
-- PARAMETERS: int person, int asset
-- RETURNS: bool true if can download, false if not
CREATE OR REPLACE FUNCTION ct_canDownloadIncoming(who int, what int) RETURNS BOOL AS $$
BEGIN
    -- you can always download your own stuff
    PERFORM * FROM assets WHERE id = what AND partner = who;
    IF FOUND THEN
       RETURN TRUE;
    END IF;

    -- you can always download things as superuser validator
    IF ct_isSuperuserValidator(who) THEN
       RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE 'plpgsql';

-- registers a download
-- PARAMETERS: int person, int asset, inet from
-- RETURNS: bool true if can download, false if not
CREATE OR REPLACE FUNCTION ct_recordDownload(who int, what int, fromWhere inet, store text) RETURNS VOID AS $$
DECLARE
    asset   RECORD;
BEGIN
    SELECT INTO asset name, version FROM assets WHERE id = what;
    IF FOUND THEN
        INSERT INTO downloads (asset, person, store, address, title, version) VALUES (what, who, store, fromWhere, asset.name, asset.version);
    END IF;
END;
$$ LANGUAGE 'plpgsql';

-- adds points
-- PARAMETERS: int person, int numberOfPoints, text comment
-- RETURNS: bool true if points were successfully added
CREATE OR REPLACE FUNCTION ct_addPoints(who int, addpoints int, description text) RETURNS INT AS $$
DECLARE
    rv int := -1;
BEGIN
    UPDATE people SET points = points + addpoints WHERE id = who;
    IF FOUND THEN
        INSERT INTO pointTransactions (person, points, comment) VALUES (who, addpoints, description);
        SELECT INTO rv points FROM people WHERE id = who;
    END  IF;

    RETURN rv;
END;
$$ LANGUAGE 'plpgsql';

-- redeem a points code
-- PARAMETERS: text code
-- RETURNS: bool true if code successfully redeemed
CREATE OR REPLACE FUNCTION ct_redeemPointsCode(tryCode text, who int) RETURNS INT AS $$
DECLARE
    addPoints        int;
    pointsTransfered int;
BEGIN
    SELECT INTO addPoints points FROM pointCodes WHERE code = tryCode;
    UPDATE pointCodes SET claimed = true WHERE NOT claimed AND code = tryCode AND (expires IS NULL OR expires >= (current_timestamp AT TIME ZONE 'UTC'));
    IF NOT FOUND THEN
        RETURN -1;
    END IF;

    SELECT INTO pointsTransfered ct_addPoints(who, addPoints, 'Code redeemed: ' || trycode);
    if (pointsTransfered < 0) THEN
        UPDATE pointCodes SET claimed = false WHERE code = trycode;
        RETURN -1;
    END IF;

    RETURN pointsTransfered;
END;
$$ LANGUAGE 'plpgsql';

-- creates points codes
-- PARAMETERS: int number of codes to create, amount of points for each code, timestamp expiration date
-- RETURNS: nothing
CREATE OR REPLACE FUNCTION ct_createPointsCodes(numToCreate int, amount int, expiration timestamp) RETURNS VOID AS $$
DECLARE
    i   int := 0;
BEGIN
    WHILE (i < numToCreate) LOOP
        INSERT INTO pointCodes (code, points, expires) VALUES (random_string(20), amount, expiration);
        IF FOUND THEN
            i := i + 1;
        END IF;
    END LOOP;
END;
$$ LANGUAGE 'plpgsql';
