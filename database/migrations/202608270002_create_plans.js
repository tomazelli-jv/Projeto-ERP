import { addTimestamps, addUuidPrimaryKey, configureTenantTable } from '../migration-helpers.js';

export async function up(knex) {
  await knex.schema.createTable('plans', (table) => {
    addUuidPrimaryKey(table);
    table.string('code', 50).notNullable();
    table.string('name', 120).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_public').notNullable().defaultTo(false);
    addTimestamps(table, knex);
    table.unique(['code'], { indexName: 'uq_plans_code' });
    configureTenantTable(table);
  });

  await knex.schema.createTable('plan_limits', (table) => {
    addUuidPrimaryKey(table);
    table.string('plan_id', 36).notNullable();
    table.string('key', 80).notNullable();
    table.bigInteger('value').unsigned().notNullable();
    addTimestamps(table, knex);
    table.foreign('plan_id', 'fk_plan_limits_plan').references('id').inTable('plans').onDelete('RESTRICT');
    table.unique(['plan_id', 'key'], { indexName: 'uq_plan_limits_plan_key' });
    table.index(['key'], 'idx_plan_limits_key');
    configureTenantTable(table);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('plan_limits');
  await knex.schema.dropTable('plans');
}
