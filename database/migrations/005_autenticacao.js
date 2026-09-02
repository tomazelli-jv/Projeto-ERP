const tableOptions = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export async function up(knex) {
  await knex.raw(
    `CREATE TABLE \`sessao_usuario\` (` +
      `\`id_sessao\` CHAR(36) NOT NULL, \`id_usuario\` CHAR(36) NOT NULL, ` +
      `\`criada_em\` DATETIME(6) NOT NULL, \`ultimo_uso_em\` DATETIME(6) NOT NULL, ` +
      `\`expira_em\` DATETIME(6) NOT NULL, \`revogada_em\` DATETIME(6) NULL, ` +
      `\`motivo_revogacao\` VARCHAR(64) NULL, \`ip_inicial\` VARCHAR(45) NULL, ` +
      `\`user_agent\` VARCHAR(255) NULL, \`atualizada_em\` DATETIME(6) NOT NULL, ` +
      `PRIMARY KEY (\`id_sessao\`), ` +
      `CONSTRAINT \`fk_sessao_usuario_usuario\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`usuarios\` (\`id_usuario\`) ON DELETE CASCADE ON UPDATE RESTRICT, ` +
      `KEY \`idx_sessao_usuario_estado\` (\`id_usuario\`, \`revogada_em\`, \`expira_em\`), ` +
      `KEY \`idx_sessao_usuario_expira_em\` (\`expira_em\`), ` +
      `CONSTRAINT \`chk_sessao_usuario_expiracao\` CHECK (\`expira_em\` > \`criada_em\`)) ${tableOptions}`
  );

  await knex.raw(
    `CREATE TABLE \`token_refresh\` (` +
      `\`id_token\` CHAR(36) NOT NULL, \`id_sessao\` CHAR(36) NOT NULL, ` +
      `\`token_hash\` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, ` +
      `\`id_familia\` CHAR(36) NOT NULL, \`id_token_anterior\` CHAR(36) NULL, ` +
      `\`id_token_substituto\` CHAR(36) NULL, \`criado_em\` DATETIME(6) NOT NULL, ` +
      `\`expira_em\` DATETIME(6) NOT NULL, \`usado_em\` DATETIME(6) NULL, ` +
      `\`revogado_em\` DATETIME(6) NULL, \`motivo_revogacao\` VARCHAR(64) NULL, ` +
      `\`atualizado_em\` DATETIME(6) NOT NULL, PRIMARY KEY (\`id_token\`), ` +
      `CONSTRAINT \`fk_token_refresh_sessao\` FOREIGN KEY (\`id_sessao\`) REFERENCES \`sessao_usuario\` (\`id_sessao\`) ON DELETE CASCADE ON UPDATE RESTRICT, ` +
      `UNIQUE KEY \`uq_token_refresh_hash\` (\`token_hash\`), ` +
      `UNIQUE KEY \`uq_token_refresh_anterior\` (\`id_token_anterior\`), ` +
      `KEY \`idx_token_refresh_sessao_estado\` (\`id_sessao\`, \`revogado_em\`, \`expira_em\`), ` +
      `KEY \`idx_token_refresh_familia\` (\`id_familia\`), ` +
      `KEY \`idx_token_refresh_expira_em\` (\`expira_em\`), ` +
      `CONSTRAINT \`chk_token_refresh_expiracao\` CHECK (\`expira_em\` > \`criado_em\`)) ${tableOptions}`
  );

  await knex.raw(
    `CREATE TABLE \`tentativa_login\` (` +
      `\`id_tentativa\` CHAR(36) NOT NULL, ` +
      `\`email_hash\` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, ` +
      `\`id_usuario\` CHAR(36) NULL, \`sucesso\` TINYINT(1) NOT NULL, ` +
      `\`motivo\` VARCHAR(40) NOT NULL, \`ip_address\` VARCHAR(45) NULL, ` +
      `\`data_cadastro\` DATETIME(6) NOT NULL, PRIMARY KEY (\`id_tentativa\`), ` +
      `CONSTRAINT \`fk_tentativa_login_usuario\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`usuarios\` (\`id_usuario\`) ON DELETE SET NULL ON UPDATE RESTRICT, ` +
      `KEY \`idx_tentativa_login_email_janela\` (\`email_hash\`, \`data_cadastro\`, \`sucesso\`), ` +
      `KEY \`idx_tentativa_login_ip_janela\` (\`ip_address\`, \`data_cadastro\`), ` +
      `KEY \`idx_tentativa_login_data_cadastro\` (\`data_cadastro\`)) ${tableOptions}`
  );

  await knex.raw(
    `CREATE TABLE \`evento_seguranca\` (` +
      `\`id_evento\` CHAR(36) NOT NULL, \`id_usuario\` CHAR(36) NULL, ` +
      `\`id_sessao\` CHAR(36) NULL, \`tipo_evento\` VARCHAR(64) NOT NULL, ` +
      `\`resultado\` VARCHAR(20) NOT NULL, \`metadata_json\` VARCHAR(1000) NULL, ` +
      `\`ip_address\` VARCHAR(45) NULL, \`data_cadastro\` DATETIME(6) NOT NULL, ` +
      `PRIMARY KEY (\`id_evento\`), ` +
      `CONSTRAINT \`fk_evento_seguranca_usuario\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`usuarios\` (\`id_usuario\`) ON DELETE SET NULL ON UPDATE RESTRICT, ` +
      `CONSTRAINT \`fk_evento_seguranca_sessao\` FOREIGN KEY (\`id_sessao\`) REFERENCES \`sessao_usuario\` (\`id_sessao\`) ON DELETE SET NULL ON UPDATE RESTRICT, ` +
      `KEY \`idx_evento_seguranca_usuario_data\` (\`id_usuario\`, \`data_cadastro\`), ` +
      `KEY \`idx_evento_seguranca_sessao_data\` (\`id_sessao\`, \`data_cadastro\`), ` +
      `KEY \`idx_evento_seguranca_tipo_data\` (\`tipo_evento\`, \`data_cadastro\`), ` +
      `CONSTRAINT \`chk_evento_seguranca_resultado\` CHECK (\`resultado\` IN ('success', 'failure', 'denied'))` +
      `) ${tableOptions}`
  );
}

export async function down(knex) {
  await knex.raw('DROP TABLE `evento_seguranca`');
  await knex.raw('DROP TABLE `tentativa_login`');
  await knex.raw('DROP TABLE `token_refresh`');
  await knex.raw('DROP TABLE `sessao_usuario`');
}
