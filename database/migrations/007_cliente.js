const at = (column, position) => `ASCII(SUBSTRING(\`${column}\`, ${position}, 1))`;
const digit = (column, position) => `(${at(column, position)} BETWEEN 48 AND 57)`;
const alphaNumeric = (column, position) =>
  `((${at(column, position)} BETWEEN 48 AND 57) OR (${at(column, position)} BETWEEN 65 AND 90))`;
const cpf = [...Array(11)].map((_, index) => digit('documento', index + 1)).join(' AND ');
const cnpj =
  [...Array(12)].map((_, index) => alphaNumeric('documento', index + 1)).join(' AND ') +
  ` AND ${digit('documento', 13)} AND ${digit('documento', 14)}`;

export async function up(knex) {
  // The composite store FK proves company ownership; a second company FK would be redundant.
  await knex.raw(
    `CREATE TABLE \`cliente\` (` +
      `\`id_cliente\` CHAR(36) NOT NULL, \`id_empresa\` CHAR(36) NOT NULL, \`id_loja_cadastro\` CHAR(36) NOT NULL, ` +
      `\`nome_fantasia\` VARCHAR(180) NOT NULL, \`razao_social\` VARCHAR(180) NULL, \`tipo\` VARCHAR(2) NOT NULL, ` +
      `\`documento\` VARCHAR(14) NULL, \`telefone\` VARCHAR(20) NULL, \`email\` VARCHAR(254) NULL, ` +
      `\`cep\` VARCHAR(8) NULL, \`cidade\` VARCHAR(120) NULL, \`rua\` VARCHAR(180) NULL, \`uf\` CHAR(2) NULL, ` +
      `\`ativo\` TINYINT(1) NOT NULL DEFAULT 1, \`data_cadastro\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
      `PRIMARY KEY (\`id_cliente\`), UNIQUE KEY \`uq_cliente_empresa_documento\` (\`id_empresa\`,\`documento\`), ` +
      `KEY \`idx_cliente_loja_cadastro\` (\`id_loja_cadastro\`), KEY \`idx_cliente_empresa_ativo\` (\`id_empresa\`,\`ativo\`), ` +
      `KEY \`idx_cliente_empresa_nome\` (\`id_empresa\`,\`nome_fantasia\`,\`id_cliente\`), ` +
      `CONSTRAINT \`fk_cliente_empresa_loja\` FOREIGN KEY (\`id_empresa\`,\`id_loja_cadastro\`) REFERENCES \`loja\` (\`id_empresa\`,\`id_loja\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `CONSTRAINT \`chk_cliente_tipo\` CHECK (\`tipo\` IN ('PF','PJ')), ` +
      `CONSTRAINT \`chk_cliente_documento\` CHECK (\`documento\` IS NULL OR (\`tipo\`='PF' AND CHAR_LENGTH(\`documento\`)=11 AND ${cpf}) OR (\`tipo\`='PJ' AND CHAR_LENGTH(\`documento\`)=14 AND ${cnpj})), ` +
      `CONSTRAINT \`chk_cliente_cep\` CHECK (\`cep\` IS NULL OR (CHAR_LENGTH(\`cep\`)=8 AND ${[...Array(8)].map((_, index) => digit('cep', index + 1)).join(' AND ')})), ` +
      `CONSTRAINT \`chk_cliente_uf\` CHECK (\`uf\` IS NULL OR (CHAR_LENGTH(\`uf\`)=2 AND ${at('uf', 1)} BETWEEN 65 AND 90 AND ${at('uf', 2)} BETWEEN 65 AND 90))` +
      `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

export async function down(knex) {
  // Cliente is the only object owned by this migration.
  await knex.raw('DROP TABLE `cliente`');
}
