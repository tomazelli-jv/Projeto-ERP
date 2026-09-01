const tableOptions = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export async function up(knex) {
  await knex.raw(
    `CREATE TABLE \`perfis\` (` +
      `\`id_perfil\` CHAR(36) NOT NULL, \`nome\` VARCHAR(100) NOT NULL, ` +
      `\`nome_normalizado\` VARCHAR(100) NOT NULL, \`concorrencia_stamp\` CHAR(36) NOT NULL, ` +
      `PRIMARY KEY (\`id_perfil\`), ` +
      `UNIQUE KEY \`uq_perfis_nome_normalizado\` (\`nome_normalizado\`)) ${tableOptions}`
  );

  await knex.raw(
    `CREATE TABLE \`usuario_perfis\` (` +
      `\`id_usuario\` CHAR(36) NOT NULL, \`id_perfil\` CHAR(36) NOT NULL, ` +
      `PRIMARY KEY (\`id_usuario\`, \`id_perfil\`), ` +
      `CONSTRAINT \`fk_usuario_perfis_usuario\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`usuarios\` (\`id_usuario\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `CONSTRAINT \`fk_usuario_perfis_perfil\` FOREIGN KEY (\`id_perfil\`) REFERENCES \`perfis\` (\`id_perfil\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `KEY \`idx_usuario_perfis_id_perfil\` (\`id_perfil\`)) ${tableOptions}`
  );

  await knex.raw(
    `CREATE TABLE \`permissao\` (` +
      `\`id_permissao\` CHAR(36) NOT NULL, \`nome\` VARCHAR(120) NOT NULL, ` +
      `\`descricao\` VARCHAR(255) NULL, \`modulo\` VARCHAR(80) NOT NULL, ` +
      `PRIMARY KEY (\`id_permissao\`), ` +
      `UNIQUE KEY \`uq_permissao_modulo_nome\` (\`modulo\`, \`nome\`)) ${tableOptions}`
  );

  await knex.raw(
    `CREATE TABLE \`usuario_claims\` (` +
      `\`id_claim\` CHAR(36) NOT NULL, \`id_usuario\` CHAR(36) NOT NULL, ` +
      `\`claim_type\` VARCHAR(100) NOT NULL, \`claim_value\` VARCHAR(255) NOT NULL, ` +
      `PRIMARY KEY (\`id_claim\`), ` +
      `CONSTRAINT \`fk_usuario_claims_usuario\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`usuarios\` (\`id_usuario\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `UNIQUE KEY \`uq_usuario_claims_usuario_tipo_valor\` (\`id_usuario\`, \`claim_type\`, \`claim_value\`)) ${tableOptions}`
  );
}

export async function down(knex) {
  await knex.raw('DROP TABLE `usuario_claims`');
  await knex.raw('DROP TABLE `usuario_perfis`');
  await knex.raw('DROP TABLE `permissao`');
  await knex.raw('DROP TABLE `perfis`');
}
