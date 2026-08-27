export async function up(knex) {
  await knex.schema.alterTable('branches', (table) => {
    table.dropUnique(['tenant_id', 'tax_id'], 'uq_branches_tenant_tax_id');
    table.unique(['tax_id'], { indexName: 'uq_branches_tax_id' });
  });
}

export async function down(knex) {
  await knex.schema.alterTable('branches', (table) => {
    table.dropUnique(['tax_id'], 'uq_branches_tax_id');
    table.unique(['tenant_id', 'tax_id'], { indexName: 'uq_branches_tenant_tax_id' });
  });
}
