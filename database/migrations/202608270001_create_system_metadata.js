export async function up(knex) {
  await knex.schema.createTable('system_metadata', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('metadata_key', 100).notNullable().unique();
    table.string('metadata_value', 255).notNullable();
    table.timestamp('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.timestamp('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.engine('InnoDB');
    table.charset('utf8mb4');
    table.collate('utf8mb4_unicode_ci');
  });

  await knex('system_metadata').insert({ metadata_key: 'schema_foundation', metadata_value: '1.1' });
}

export async function down(knex) {
  await knex.schema.dropTable('system_metadata');
}
