import { addTimestamps, addUuidPrimaryKey, configureTenantTable } from '../migration-helpers.js';

export async function up(knex) {
  await knex.schema.createTable('tenants', (table) => {
    addUuidPrimaryKey(table);
    table.string('name', 160).notNullable();
    table.string('slug', 100).notNullable();
    table.string('status', 20).notNullable().defaultTo('active');
    table.string('timezone', 64).notNullable().defaultTo('America/Sao_Paulo');
    table.string('locale', 10).notNullable().defaultTo('pt-BR');
    addTimestamps(table, knex);
    table.unique(['slug'], { indexName: 'uq_tenants_slug' });
    table.index(['status'], 'idx_tenants_status');
    configureTenantTable(table);
  });
  await knex.raw(
    "ALTER TABLE tenants ADD CONSTRAINT chk_tenants_status CHECK (status IN ('active','suspended','cancelled'))"
  );

  await knex.schema.createTable('companies', (table) => {
    addUuidPrimaryKey(table);
    table.string('tenant_id', 36).notNullable();
    table.string('legal_name', 180).notNullable();
    table.string('trade_name', 180).nullable();
    table.string('tax_id_root', 8).nullable();
    table.string('status', 20).notNullable().defaultTo('active');
    addTimestamps(table, knex);
    table
      .foreign('tenant_id', 'fk_companies_tenant')
      .references('id')
      .inTable('tenants')
      .onDelete('RESTRICT');
    table.unique(['tenant_id', 'id'], { indexName: 'uq_companies_tenant_id' });
    table.index(['tenant_id', 'status'], 'idx_companies_tenant_status');
    table.index(['tenant_id', 'tax_id_root'], 'idx_companies_tenant_tax_root');
    configureTenantTable(table);
  });
  await knex.raw(
    "ALTER TABLE companies ADD CONSTRAINT chk_companies_status CHECK (status IN ('active','inactive')), ADD CONSTRAINT chk_companies_tax_id_root CHECK (tax_id_root IS NULL OR tax_id_root REGEXP '^[0-9]{8}$')"
  );

  await knex.schema.createTable('branches', (table) => {
    addUuidPrimaryKey(table);
    table.string('tenant_id', 36).notNullable();
    table.string('company_id', 36).notNullable();
    table.string('code', 50).notNullable();
    table.string('legal_name', 180).notNullable();
    table.string('trade_name', 180).nullable();
    table.string('tax_id', 14).nullable();
    table.boolean('is_headquarters').notNullable().defaultTo(false);
    table.string('status', 20).notNullable().defaultTo('active');
    table.string('email', 254).nullable();
    table.string('phone', 20).nullable();
    addTimestamps(table, knex);
    table.foreign('tenant_id', 'fk_branches_tenant').references('id').inTable('tenants').onDelete('RESTRICT');
    table
      .foreign(['tenant_id', 'company_id'], 'fk_branches_tenant_company')
      .references(['tenant_id', 'id'])
      .inTable('companies')
      .onDelete('RESTRICT');
    table.unique(['tenant_id', 'id'], { indexName: 'uq_branches_tenant_id' });
    table.unique(['company_id', 'code'], { indexName: 'uq_branches_company_code' });
    table.unique(['tenant_id', 'tax_id'], { indexName: 'uq_branches_tenant_tax_id' });
    table.index(['tenant_id', 'status'], 'idx_branches_tenant_status');
    table.index(['company_id'], 'idx_branches_company');
    table.index(['tax_id'], 'idx_branches_tax_id');
    configureTenantTable(table);
  });
  await knex.raw(
    "ALTER TABLE branches ADD COLUMN headquarters_company_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN is_headquarters = 1 THEN company_id ELSE NULL END) STORED, ADD CONSTRAINT chk_branches_status CHECK (status IN ('active','inactive')), ADD CONSTRAINT chk_branches_tax_id CHECK (tax_id IS NULL OR tax_id REGEXP '^[0-9]{14}$'), ADD CONSTRAINT uq_branches_one_headquarters UNIQUE (company_id, headquarters_company_id)"
  );

  await knex.schema.createTable('branch_addresses', (table) => {
    addUuidPrimaryKey(table);
    table.string('tenant_id', 36).notNullable();
    table.string('branch_id', 36).notNullable();
    table.string('postal_code', 8).nullable();
    table.string('street', 180).notNullable();
    table.string('number', 30).notNullable();
    table.string('complement', 120).nullable();
    table.string('district', 120).notNullable();
    table.string('city', 120).notNullable();
    table.string('state', 2).notNullable();
    table.string('country_code', 2).notNullable().defaultTo('BR');
    addTimestamps(table, knex);
    table
      .foreign('tenant_id', 'fk_branch_addresses_tenant')
      .references('id')
      .inTable('tenants')
      .onDelete('RESTRICT');
    table
      .foreign(['tenant_id', 'branch_id'], 'fk_branch_addresses_tenant_branch')
      .references(['tenant_id', 'id'])
      .inTable('branches')
      .onDelete('RESTRICT');
    table.unique(['tenant_id', 'branch_id'], { indexName: 'uq_branch_addresses_primary' });
    table.index(['tenant_id'], 'idx_branch_addresses_tenant');
    configureTenantTable(table);
  });
  await knex.raw(
    "ALTER TABLE branch_addresses ADD CONSTRAINT chk_branch_addresses_postal_code CHECK (postal_code IS NULL OR postal_code REGEXP '^[0-9]{8}$'), ADD CONSTRAINT chk_branch_addresses_state CHECK (state REGEXP '^[A-Z]{2}$'), ADD CONSTRAINT chk_branch_addresses_country CHECK (country_code REGEXP '^[A-Z]{2}$')"
  );
}

export async function down(knex) {
  await knex.schema.dropTable('branch_addresses');
  await knex.schema.dropTable('branches');
  await knex.schema.dropTable('companies');
  await knex.schema.dropTable('tenants');
}
