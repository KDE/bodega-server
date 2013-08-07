CREATE OR REPLACE FUNCTION ct_createUserInDiscourse() RETURNS TRIGGER AS $$
DECLARE
    customUsername TEXT;
    trust_level INT;
    currentTime TIMESTAMP;
    userNameLower TEXT;

    updateFullname TEXT;
    updateUsername TEXT;
    updateEmail TEXT;
    updatePassword TEXT;
    updateUsernameLower TEXT;
BEGIN
        -- NOTE: the ''' are 3 single quotes
        --trust_level := 0;
        currentTime := current_timestamp AT TIME ZONE 'UTC';

        PERFORM dblink_connect('dbname=discourse_development');

        IF (TG_OP = 'INSERT') THEN
            customUsername := split_part(NEW.email, '@', 1);
            userNameLower := lower(customUsername);
            trust_level := 1;

            PERFORM dblink_exec('INSERT INTO users (name, username, email, password_hash,
                                 created_at, updated_at, username_lower, trust_level)
                                 VALUES ('''||NEW.fullname||''', '''||customUsername||''',
                                 '''||NEW.email||''', '''||NEW.password||''',
                                 '''||currentTime||''', '''||currentTime||''',
                                 '''||userNameLower||''', '''||trust_level||''');' );
        ELSIF (TG_OP = 'UPDATE') THEN
            IF NEW.fullname IS NULL THEN
                updateFullname := OLD.fullname;
            ELSE
                updateFullname := NEW.fullname;
            END IF;

            IF NEW.email IS NULL THEN
                updateEmail := OLD.email;
            ELSE
                updateEmail := NEW.email;
            END IF;

            IF NEW.Password IS NULL THEN
                updatePassword := OLD.password;
            ELSE
                updatePassword := NEW.password;
            END IF;


            -- TODO? when the user changes his email his username in discourse
            -- will also change, since its comes for his email. Is this a real issue?
            updateUsername := split_part(updateEmail, '@', 1);
            updateUsernameLower := lower(updateUsername);

            PERFORM dblink_exec('UPDATE users SET name = '''||updateFullname||''',
                                 username = '''||updateUsername||''',
                                 email = '''||updateEmail||''',
                                 password_hash = '''||updatePassword||''',
                                 updated_at = '''||currentTime||''',
                                 username_lower = '''||updateUsernameLower||'''
                                 WHERE email = '''||OLD.email||''';');
        END IF;

    PERFORM dblink_disconnect();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Something is wrong with your discourse database, check if the database exists';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_generateCategoryName(text) RETURNS TEXT AS $$
DECLARE
BEGIN
    RETURN 'Forum for ' || $1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_generateCategoryDescription(text) RETURNS TEXT AS $$
DECLARE
BEGIN
    RETURN 'In this forum you can contact the author of ' || $1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_generateTopicTitle(text) RETURNS TEXT AS $$
DECLARE
BEGIN
    RETURN 'In this forum you can contact the author of ' || $1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_createForumInDiscourse() RETURNS TRIGGER AS $$
DECLARE
    currentTime TIMESTAMP;
    userId INTEGER;
    categoryId INT;
    topicId INT;
    someText TEXT;
BEGIN
    currentTime := current_timestamp AT TIME ZONE 'UTC';
    userId := 1; -- this is the root of discourse

    PERFORM dblink_connect('dbname=discourse_development');

    IF (TG_OP = 'INSERT') THEN
        -- we will create forums only for the partners who have id >= 1000
        IF (NEW.partner < 1000) THEN
            RETURN NEW;
        END IF;

        SELECT INTO categoryId id FROM dblink('INSERT INTO categories (name, created_at, updated_at, description, user_id, slug)
                            VALUES ('''||ct_generateCategoryName(NEW.name)||''', '''||currentTime||''',
                            '''||currentTime||''', '''||ct_generateCategoryDescription(NEW.name)||''',
                            '''||userId||''', '''||ct_generateCategoryName(NEW.name)||''') RETURNING id;' )
                            AS f(id int);

        SELECT INTO topicId id FROM dblink('INSERT INTO topics (title, created_at, updated_at,
                            user_id, last_post_user_id, bumped_at, category_id)
                            VALUES('''||ct_generateTopicTitle(NEW.name)||''', '''||currentTime||''', '''||currentTime||''',
                            '''||userId||''', '''||userId||''', '''||currentTime||''',
                            '''||categoryId||''') RETURNING id;') AS f(id int);

        PERFORM dblink_exec('INSERT INTO category_featured_topics (category_id, topic_id, created_at, updated_at, rank)
                            VALUES ('''||categoryId||''', '''||topicId||''', '''||currentTime||''', '''||currentTime||''', 0);');

        someText := 'foo';
        PERFORM dblink_exec('INSERT INTO posts (user_id, topic_id, post_number, raw, cooked,
                            created_at, updated_at, last_version_at)
                            VALUES ('''||userId||''', '''||topicId||''', 0, '''||someText||''', '''||someText||''',
                                    '''||currentTime||''', '''||currentTime||''', '''||currentTime||'''); ');

        PERFORM dblink_exec('INSERT INTO bodegaAssets (asset, topic, category)
                            VALUES ('''||NEW.id||''', '''||topicId||''', '''||categoryId||''');');

    ELSIF (TG_OP = 'UPDATE') THEN
        PERFORM dblink_exec('UPDATE categories SET name = '''||ct_generateCategoryName(NEW.name)||''',
                            updated_at = '''||currentTime||''', description = '''||ct_generateCategoryDescription(NEW.name)||''',
                            slug = '''||ct_generateCategoryName(NEW.name)||''' FROM bodegaAssets ba WHERE ba.asset = '''||NEW.id||'''
                            AND ba.category = id;');

        PERFORM dblink_exec('UPDATE topics SET title = '''||ct_generateTopicTitle(NEW.name)||''', updated_at = '''||currentTime||'''
                        FROM bodegaAssets ba WHERE ba.asset = '''||NEW.id||''' AND ba.topic = id;');

    END IF;
    PERFORM dblink_disconnect();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Something is wrong with your discourse database, check if the database exists';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_enableDiscourseIntegration(enable bool) RETURNS VOID AS $$
BEGIN
    IF enable THEN
        BEGIN
            CREATE TRIGGER trg_ct_createForumInDiscourse AFTER UPDATE OF name OR INSERT ON assets
            FOR EACH ROW EXECUTE PROCEDURE ct_createForumInDiscourse();
        EXCEPTION WHEN OTHERS THEN
        END;
        BEGIN
            CREATE TRIGGER trg_ct_createUserInDiscourse AFTER UPDATE OF fullname, password, email OR INSERT ON people
            FOR EACH ROW EXECUTE PROCEDURE ct_createUserInDiscourse();
        EXCEPTION WHEN OTHERS THEN
        END;
    ELSE
        DROP TRIGGER IF EXISTS trg_ct_createUserInDiscourse ON people;
        DROP TRIGGER IF EXISTS trg_ct_createForumInDiscourse ON assets;
    END IF;
END;
$$ LANGUAGE plpgsql;

