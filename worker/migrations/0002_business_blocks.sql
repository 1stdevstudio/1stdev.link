-- Apply once before deploying the business-mode Worker.
ALTER TABLE bio_profiles ADD COLUMN business_json TEXT CHECK (business_json IS NULL OR json_valid(business_json));
ALTER TABLE links ADD COLUMN data_json TEXT CHECK (data_json IS NULL OR json_valid(data_json));
