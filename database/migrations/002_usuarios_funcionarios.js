const tableOptions = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export async function up(knex) {
  await knex.raw(
    `CREATE TABLE \`usuarios\` (` +
      `\`id_usuario\` CHAR(36) NOT NULL, \`user_name\` VARCHAR(100) NOT NULL, ` +
      `\`password_hash\` VARCHAR(255) NOT NULL, \`email\` VARCHAR(254) NOT NULL, ` +
      `\`data_cadastro\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
      `\`ativo\` TINYINT(1) NOT NULL DEFAULT 1, PRIMARY KEY (\`id_usuario\`), ` +
      `UNIQUE KEY \`uq_usuarios_user_name\` (\`user_name\`), ` +
      `UNIQUE KEY \`uq_usuarios_email\` (\`email\`)) ${tableOptions}`
  );

  await knex.raw(
    `CREATE TABLE \`funcionario\` (` +
      `\`id_funcionario\` CHAR(36) NOT NULL, \`id_usuario\` CHAR(36) NULL, ` +
      `\`id_empresa\` CHAR(36) NOT NULL, \`nome\` VARCHAR(160) NOT NULL, ` +
      `PRIMARY KEY (\`id_funcionario\`), ` +
      `CONSTRAINT \`fk_funcionario_usuario\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`usuarios\` (\`id_usuario\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `CONSTRAINT \`fk_funcionario_empresa\` FOREIGN KEY (\`id_empresa\`) REFERENCES \`empresa\` (\`id_empresa\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `UNIQUE KEY \`uq_funcionario_id_usuario\` (\`id_usuario\`), ` +
      `KEY \`idx_funcionario_id_empresa\` (\`id_empresa\`), ` +
      `UNIQUE KEY \`uq_funcionario_empresa_funcionario\` (\`id_empresa\`, \`id_funcionario\`)) ${tableOptions}`
  );

  await knex.raw('ALTER TABLE `loja` ADD UNIQUE KEY `uq_loja_empresa_loja` (`id_empresa`, `id_loja`)');

  await knex.raw(
    `CREATE TABLE \`funcionario_loja\` (` +
      `\`id_funcionario_loja\` CHAR(36) NOT NULL, \`id_funcionario\` CHAR(36) NOT NULL, ` +
      `\`id_loja\` CHAR(36) NOT NULL, \`id_empresa\` CHAR(36) NOT NULL, ` +
      `PRIMARY KEY (\`id_funcionario_loja\`), ` +
      `CONSTRAINT \`fk_funcionario_loja_funcionario\` FOREIGN KEY (\`id_empresa\`, \`id_funcionario\`) REFERENCES \`funcionario\` (\`id_empresa\`, \`id_funcionario\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `CONSTRAINT \`fk_funcionario_loja_loja\` FOREIGN KEY (\`id_empresa\`, \`id_loja\`) REFERENCES \`loja\` (\`id_empresa\`, \`id_loja\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `UNIQUE KEY \`uq_funcionario_loja_funcionario_loja\` (\`id_funcionario\`, \`id_loja\`), ` +
      `KEY \`idx_funcionario_loja_empresa_funcionario\` (\`id_empresa\`, \`id_funcionario\`), ` +
      `KEY \`idx_funcionario_loja_empresa_loja\` (\`id_empresa\`, \`id_loja\`), ` +
      `KEY \`idx_funcionario_loja_id_loja\` (\`id_loja\`)) ${tableOptions}`
  );
}

export async function down(knex) {
  await knex.raw('DROP TABLE `funcionario_loja`');
  await knex.raw('DROP TABLE `funcionario`');
  await knex.raw('DROP TABLE `usuarios`');
  await knex.raw('ALTER TABLE `loja` DROP INDEX `uq_loja_empresa_loja`');
}
