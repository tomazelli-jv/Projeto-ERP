// Historical Knex-compatible source. The ASP.NET runner executes equivalent SQL
// from MigrationCatalog while preserving this exact ledger identifier.
export async function up(knex) {
  await knex.raw(
    "ALTER TABLE `users` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active' AFTER `phone`, ADD COLUMN `last_login_at` DATETIME(6) NULL AFTER `status`, ADD CONSTRAINT `chk_users_status` CHECK (`status` IN ('pending','active','blocked','inactive')), ADD KEY `idx_users_status` (`status`)"
  );
  await knex.raw(
    'CREATE TABLE `auth_sessions` (`id` CHAR(36) NOT NULL PRIMARY KEY, `user_id` VARCHAR(36) NOT NULL, `created_at` DATETIME(6) NOT NULL, `last_used_at` DATETIME(6) NOT NULL, `absolute_expires_at` DATETIME(6) NOT NULL, `revoked_at` DATETIME(6) NULL, `revocation_reason` VARCHAR(64) NULL, `initial_ip` VARCHAR(45) NULL, `user_agent` VARCHAR(255) NULL, `updated_at` DATETIME(6) NOT NULL, CONSTRAINT `fk_auth_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE, KEY `idx_auth_sessions_user_state` (`user_id`,`revoked_at`,`absolute_expires_at`), KEY `idx_auth_sessions_expiry` (`absolute_expires_at`), CONSTRAINT `chk_auth_sessions_expiry` CHECK (`absolute_expires_at` > `created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  );
  await knex.raw(
    'CREATE TABLE `refresh_tokens` (`id` CHAR(36) NOT NULL PRIMARY KEY, `session_id` CHAR(36) NOT NULL, `token_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, `family_id` CHAR(36) NOT NULL, `previous_token_id` CHAR(36) NULL, `replaced_by_token_id` CHAR(36) NULL, `created_at` DATETIME(6) NOT NULL, `expires_at` DATETIME(6) NOT NULL, `used_at` DATETIME(6) NULL, `revoked_at` DATETIME(6) NULL, `revocation_reason` VARCHAR(64) NULL, `updated_at` DATETIME(6) NOT NULL, CONSTRAINT `fk_refresh_tokens_session` FOREIGN KEY (`session_id`) REFERENCES `auth_sessions` (`id`) ON DELETE CASCADE, UNIQUE KEY `uq_refresh_tokens_hash` (`token_hash`), UNIQUE KEY `uq_refresh_tokens_previous` (`previous_token_id`), KEY `idx_refresh_tokens_session_state` (`session_id`,`revoked_at`,`expires_at`), KEY `idx_refresh_tokens_family` (`family_id`), KEY `idx_refresh_tokens_expiry` (`expires_at`), CONSTRAINT `chk_refresh_tokens_expiry` CHECK (`expires_at` > `created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  );
  await knex.raw(
    'CREATE TABLE `login_attempts` (`id` CHAR(36) NOT NULL PRIMARY KEY, `email_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, `user_id` VARCHAR(36) NULL, `succeeded` TINYINT(1) NOT NULL, `reason` VARCHAR(40) NOT NULL, `ip_address` VARCHAR(45) NULL, `created_at` DATETIME(6) NOT NULL, CONSTRAINT `fk_login_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL, KEY `idx_login_attempts_email_window` (`email_hash`,`created_at`,`succeeded`), KEY `idx_login_attempts_ip_window` (`ip_address`,`created_at`), KEY `idx_login_attempts_created` (`created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  );
  await knex.raw(
    "CREATE TABLE `security_events` (`id` CHAR(36) NOT NULL PRIMARY KEY, `user_id` VARCHAR(36) NULL, `session_id` CHAR(36) NULL, `event_type` VARCHAR(64) NOT NULL, `result` VARCHAR(20) NOT NULL, `metadata_json` VARCHAR(1000) NULL, `ip_address` VARCHAR(45) NULL, `created_at` DATETIME(6) NOT NULL, CONSTRAINT `fk_security_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL, CONSTRAINT `fk_security_events_session` FOREIGN KEY (`session_id`) REFERENCES `auth_sessions` (`id`) ON DELETE SET NULL, KEY `idx_security_events_user_created` (`user_id`,`created_at`), KEY `idx_security_events_session_created` (`session_id`,`created_at`), KEY `idx_security_events_type_created` (`event_type`,`created_at`), CONSTRAINT `chk_security_events_result` CHECK (`result` IN ('success','failure','denied'))) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
  );
}

export async function down(knex) {
  await knex.raw('DROP TABLE `security_events`');
  await knex.raw('DROP TABLE `login_attempts`');
  await knex.raw('DROP TABLE `refresh_tokens`');
  await knex.raw('DROP TABLE `auth_sessions`');
  await knex.raw(
    'ALTER TABLE `users` DROP INDEX `idx_users_status`, DROP CONSTRAINT `chk_users_status`, DROP COLUMN `last_login_at`, DROP COLUMN `status`'
  );
}
