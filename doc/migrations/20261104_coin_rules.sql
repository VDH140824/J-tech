CREATE TABLE IF NOT EXISTS coin_reward_rule (
 activity_type VARCHAR(30) NOT NULL PRIMARY KEY,
 coin_amount INT UNSIGNED NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(coin_amount > 0)
);
-- No invented reward rates: administrators must enter the configured amounts.
