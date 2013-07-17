-- CREATE LANGUAGE plpgsql;

CREATE EXTENSION dblink;

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
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_createUserInDiscourse ON people;
CREATE TRIGGER trg_ct_createUserInDiscourse AFTER UPDATE OR INSERT ON people
FOR EACH ROW EXECUTE PROCEDURE ct_createUserInDiscourse();

CREATE OR REPLACE FUNCTION ct_createForumInDiscourse() RETURNS TRIGGER AS $$
DECLARE
    currentTime TIMESTAMP;
    categoryName TEXT;
    categoryDescription TEXT;
    userId INTEGER;
    categorySlug TEXT;
    name TEXT;
    topicTitle TEXT;
BEGIN
    currentTime := current_timestamp AT TIME ZONE 'UTC';
    userId := 1; -- this is the root of discourse

    PERFORM dblink_connect('dbname=discourse_development');
    IF (TG_OP = 'INSERT') THEN
        -- we will create forums only for the partners who have id >= 1000
        IF (NEW.partner < 1000) THEN
            RETURN NEW;
        END IF;

        categoryName := 'Forum for ' || NEW.name;
        categoryDescription := 'In this forum you can contact the author of' || NEW.name;
        categorySlug := categoryName;
        PERFORM dblink_exec('INSERT INTO categories (name, created_at, updated_at, description, user_id, slug)
                            VALUES ('''||categoryName||''', '''||currentTime||''',
                            '''||currentTime||''', '''||categoryDescription||''',
                            '''||userId||''', '''||categorySlug||''');' );

        -- in discourse every category must have at least one topic in order to be visible
        topicTitle := 'Welcome to the ' || NEW.name || ' category';
        PERFORM dblink_exec('INSERT INTO topics (title, created_at, updated_at,
                            user_id, last_post_user_id, bumped_at)
                            VALUES('''||topicTitle||''', '''||currentTime||''', '''||currentTime||''',
                            '''||userId||''', '''||userId||''', '''||currentTime||''');');


    ELSIF (TG_OP = 'UPDATE') THEN
        IF NEW.name IS NULL THEN
            RETURN OLD;
        ELSE
            name := NEW.name;
        END IF;

        categoryName := 'Forum for ' || name;
        categoryDescription := 'In this forum you can contact the author of ' || name;
        categorySlug := categoryName;
        name := 'Forum for ' || OLD.name;
        PERFORM dblink_exec('UPDATE categories SET name = '''||categoryName||''',
                            updated_at = '''||currentTime||''', description = '''||categoryDescription||''',
                            slug = '''||categorySlug||''' WHERE name = '''||name||''';');
    END IF;
    PERFORM dblink_disconnect();

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_createForumInDiscourse ON assets;
CREATE TRIGGER trg_ct_createForumInDiscourse AFTER UPDATE OR INSERT ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_createForumInDiscourse();

