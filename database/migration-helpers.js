export function configureTenantTable(table) {
  table.engine('InnoDB');
  table.charset('utf8mb4');
  table.collate('utf8mb4_unicode_ci');
}

export function addUuidPrimaryKey(table) {
  table.string('id', 36).primary();
}

export function addTimestamps(table, knex) {
  table.dateTime('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
  table.dateTime('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
}
