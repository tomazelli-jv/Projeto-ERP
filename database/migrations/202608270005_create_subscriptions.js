import { addTimestamps, addUuidPrimaryKey, configureTenantTable } from '../migration-helpers.js';

export async function up(knex) {
  await knex.schema.createTable('subscriptions', (table) => {
    addUuidPrimaryKey(table);
    table.string('tenant_id', 36).notNullable();
    table.string('plan_id', 36).notNullable();
    table.string('status', 20).notNullable();
    table.dateTime('starts_at', { precision: 6 }).notNullable();
    table.dateTime('trial_ends_at', { precision: 6 }).nullable();
    table.dateTime('ends_at', { precision: 6 }).nullable();
    addTimestamps(table, knex);
    table
      .foreign('tenant_id', 'fk_subscriptions_tenant')
      .references('id')
      .inTable('tenants')
      .onDelete('RESTRICT');
    table.foreign('plan_id', 'fk_subscriptions_plan').references('id').inTable('plans').onDelete('RESTRICT');
    table.index(['tenant_id', 'status'], 'idx_subscriptions_tenant_status');
    table.index(['plan_id', 'status'], 'idx_subscriptions_plan_status');
    configureTenantTable(table);
  });
  await knex.raw(
    "ALTER TABLE subscriptions ADD COLUMN current_tenant_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN status IN ('trialing','active','suspended') THEN tenant_id ELSE NULL END) STORED, ADD CONSTRAINT chk_subscriptions_status CHECK (status IN ('trialing','active','suspended','cancelled','expired')), ADD CONSTRAINT chk_subscriptions_dates CHECK (ends_at IS NULL OR ends_at >= starts_at), ADD CONSTRAINT uq_subscriptions_one_current UNIQUE (current_tenant_id)"
  );
}

export async function down(knex) {
  await knex.schema.dropTable('subscriptions');
}
