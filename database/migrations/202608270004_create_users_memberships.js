import { addTimestamps, addUuidPrimaryKey, configureTenantTable } from '../migration-helpers.js';

export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    addUuidPrimaryKey(table);
    table.string('name', 160).notNullable();
    table.string('email', 254).notNullable();
    table.string('phone', 20).nullable();
    addTimestamps(table, knex);
    table.unique(['email'], { indexName: 'uq_users_email' });
    configureTenantTable(table);
  });

  await knex.schema.createTable('tenant_memberships', (table) => {
    addUuidPrimaryKey(table);
    table.string('tenant_id', 36).notNullable();
    table.string('user_id', 36).notNullable();
    table.string('status', 20).notNullable().defaultTo('pending');
    table.boolean('is_owner').notNullable().defaultTo(false);
    table.dateTime('joined_at', { precision: 6 }).nullable();
    addTimestamps(table, knex);
    table
      .foreign('tenant_id', 'fk_memberships_tenant')
      .references('id')
      .inTable('tenants')
      .onDelete('RESTRICT');
    table.foreign('user_id', 'fk_memberships_user').references('id').inTable('users').onDelete('RESTRICT');
    table.unique(['tenant_id', 'user_id'], { indexName: 'uq_memberships_tenant_user' });
    table.index(['tenant_id', 'status'], 'idx_memberships_tenant_status');
    table.index(['user_id', 'status'], 'idx_memberships_user_status');
    configureTenantTable(table);
  });
  await knex.raw(
    "ALTER TABLE tenant_memberships ADD COLUMN active_owner_tenant_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN is_owner = 1 AND status = 'active' THEN tenant_id ELSE NULL END) STORED, ADD CONSTRAINT chk_memberships_status CHECK (status IN ('pending','active','blocked','inactive')), ADD CONSTRAINT uq_memberships_one_active_owner UNIQUE (active_owner_tenant_id)"
  );
}

export async function down(knex) {
  await knex.schema.dropTable('tenant_memberships');
  await knex.schema.dropTable('users');
}
