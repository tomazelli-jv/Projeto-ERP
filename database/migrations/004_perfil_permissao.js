const tableOptions = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export async function up(knex) {
  await knex.raw(
    `CREATE TABLE \`perfil_permissao\` (` +
      `\`id_perfil\` CHAR(36) NOT NULL, \`id_permissao\` CHAR(36) NOT NULL, ` +
      `PRIMARY KEY (\`id_perfil\`, \`id_permissao\`), ` +
      `CONSTRAINT \`fk_perfil_permissao_perfil\` FOREIGN KEY (\`id_perfil\`) REFERENCES \`perfis\` (\`id_perfil\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `CONSTRAINT \`fk_perfil_permissao_permissao\` FOREIGN KEY (\`id_permissao\`) REFERENCES \`permissao\` (\`id_permissao\`) ON DELETE RESTRICT ON UPDATE RESTRICT, ` +
      `KEY \`idx_perfil_permissao_id_permissao\` (\`id_permissao\`)) ${tableOptions}`
  );
}

export async function down(knex) {
  await knex.raw('DROP TABLE `perfil_permissao`');
}
