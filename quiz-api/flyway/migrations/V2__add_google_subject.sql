ALTER TABLE app_user ADD google_subject VARCHAR2(255 CHAR);

ALTER TABLE app_user
    ADD CONSTRAINT uq_app_user_google_subject UNIQUE (google_subject);
