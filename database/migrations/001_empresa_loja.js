const tableOptions = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export async function up(knex) {
  await knex.raw(
    `CREATE TABLE \`empresa\` (` +
      `\`id_empresa\` CHAR(36) NOT NULL, \`nome\` VARCHAR(160) NOT NULL, ` +
      `\`ativo\` TINYINT(1) NOT NULL DEFAULT 1, ` +
      `\`data_cadastro\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
      `PRIMARY KEY (\`id_empresa\`)) ${tableOptions}`
  );

  await knex.raw(
    `CREATE TABLE \`loja\` (` +
      `\`id_loja\` CHAR(36) NOT NULL, \`id_empresa\` CHAR(36) NOT NULL, ` +
      `\`razao_social\` VARCHAR(180) NOT NULL, \`nome_fantasia\` VARCHAR(180) NOT NULL, ` +
      `\`documento\` VARCHAR(14) NOT NULL, \`telefone\` VARCHAR(20) NULL, ` +
      `\`email\` VARCHAR(254) NULL, \`cep\` VARCHAR(8) NULL, \`rua\` VARCHAR(180) NULL, ` +
      `\`numero\` VARCHAR(30) NULL, \`complemento\` VARCHAR(120) NULL, ` +
      `\`bairro\` VARCHAR(120) NULL, \`cidade\` VARCHAR(120) NULL, \`uf\` CHAR(2) NULL, ` +
      `\`ativo\` TINYINT(1) NOT NULL DEFAULT 1, ` +
      `\`data_cadastro\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
      `PRIMARY KEY (\`id_loja\`), ` +
      `CONSTRAINT \`fk_loja_empresa\` FOREIGN KEY (\`id_empresa\`) REFERENCES \`empresa\` (\`id_empresa\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `UNIQUE KEY \`uq_loja_documento\` (\`documento\`), KEY \`idx_loja_id_empresa\` (\`id_empresa\`), ` +
      `CONSTRAINT \`chk_loja_documento\` CHECK (CHAR_LENGTH(\`documento\`) = 14 AND \`documento\` NOT REGEXP '[^0-9]'), ` +
      `CONSTRAINT \`chk_loja_cep\` CHECK (\`cep\` IS NULL OR CHAR_LENGTH(\`cep\`) = 8 AND \`cep\` NOT REGEXP '[^0-9]'), ` +
      `CONSTRAINT \`chk_loja_uf\` CHECK (\`uf\` IS NULL OR (CHAR_LENGTH(\`uf\`) = 2 AND BINARY \`uf\` REGEXP '^[A-Z]{2}$'))` +
      `) ${tableOptions}`
  );
}

export async function down(knex) {
  await knex.raw('DROP TABLE `loja`');
  await knex.raw('DROP TABLE `empresa`');
}
