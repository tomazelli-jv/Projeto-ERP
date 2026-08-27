import { addTimestamps, addUuidPrimaryKey, configureTenantTable } from '../migration-helpers.js';

export async function up(knex) {
  await knex.schema.createTable('user_credentials', (table) => {
    addUuidPrimaryKey(table);
    table.string('user_id', 36).notNullable();
    table.string('password_hash', 255).notNullable();
    addTimestamps(table, knex);
    table
      .foreign('user_id', 'fk_user_credentials_user')
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
    table.unique(['user_id'], { indexName: 'uq_user_credentials_user' });
    configureTenantTable(table);
  });

  await knex.schema.createTable('password_setup_tokens', (table) => {
    addUuidPrimaryKey(table);
    table.string('user_id', 36).notNullable();
    table.specificType('token_hash', 'CHAR(64) CHARACTER SET ascii COLLATE ascii_bin').notNullable();
    table.string('purpose', 40).notNullable();
    table.dateTime('expires_at', { precision: 6 }).notNullable();
    table.dateTime('used_at', { precision: 6 }).nullable();
    table.dateTime('revoked_at', { precision: 6 }).nullable();
    addTimestamps(table, knex);
    table
      .foreign('user_id', 'fk_password_setup_tokens_user')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.unique(['token_hash'], { indexName: 'uq_password_setup_tokens_hash' });
    table.index(['user_id', 'purpose', 'expires_at'], 'idx_password_setup_tokens_user_purpose_expiry');
    configureTenantTable(table);
  });
  await knex.raw(
    "ALTER TABLE password_setup_tokens ADD CONSTRAINT chk_password_setup_tokens_purpose CHECK (purpose = 'initial_password'), ADD CONSTRAINT chk_password_setup_tokens_expiry CHECK (expires_at > created_at), ADD CONSTRAINT chk_password_setup_tokens_terminal CHECK (used_at IS NULL OR revoked_at IS NULL)"
  );
}

export async function down(knex) {
  await knex.schema.dropTable('password_setup_tokens');
  await knex.schema.dropTable('user_credentials');
}
