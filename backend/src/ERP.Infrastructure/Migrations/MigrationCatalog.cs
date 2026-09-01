namespace ERP.Infrastructure.Migrations;

public static class MigrationCatalog
{
    private const string TableOptions = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    public static IReadOnlyList<MigrationDefinition> All { get; } =
    [
        new("001_empresa_loja.js",
        [
            $"""CREATE TABLE `empresa` (`id_empresa` CHAR(36) NOT NULL, `nome` VARCHAR(160) NOT NULL, `ativo` TINYINT(1) NOT NULL DEFAULT 1, `data_cadastro` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id_empresa`)) {TableOptions}""",
            $"""CREATE TABLE `loja` (`id_loja` CHAR(36) NOT NULL, `id_empresa` CHAR(36) NOT NULL, `razao_social` VARCHAR(180) NOT NULL, `nome_fantasia` VARCHAR(180) NOT NULL, `documento` VARCHAR(14) NOT NULL, `telefone` VARCHAR(20) NULL, `email` VARCHAR(254) NULL, `cep` VARCHAR(8) NULL, `rua` VARCHAR(180) NULL, `numero` VARCHAR(30) NULL, `complemento` VARCHAR(120) NULL, `bairro` VARCHAR(120) NULL, `cidade` VARCHAR(120) NULL, `uf` CHAR(2) NULL, `ativo` TINYINT(1) NOT NULL DEFAULT 1, `data_cadastro` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id_loja`), CONSTRAINT `fk_loja_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE RESTRICT ON UPDATE RESTRICT, UNIQUE KEY `uq_loja_documento` (`documento`), KEY `idx_loja_id_empresa` (`id_empresa`), CONSTRAINT `chk_loja_documento` CHECK (CHAR_LENGTH(`documento`) = 14 AND `documento` NOT REGEXP '[^0-9]'), CONSTRAINT `chk_loja_cep` CHECK (`cep` IS NULL OR CHAR_LENGTH(`cep`) = 8 AND `cep` NOT REGEXP '[^0-9]'), CONSTRAINT `chk_loja_uf` CHECK (`uf` IS NULL OR CHAR_LENGTH(`uf`) = 2 AND `uf` NOT REGEXP '[^A-Z]')) {TableOptions}"""
        ],
        [
            "DROP TABLE `loja`",
            "DROP TABLE `empresa`"
        ]),

        new("002_usuarios_funcionarios.js",
        [
            $"""CREATE TABLE `usuarios` (`id_usuario` CHAR(36) NOT NULL, `user_name` VARCHAR(100) NOT NULL, `password_hash` VARCHAR(255) NOT NULL, `email` VARCHAR(254) NOT NULL, `data_cadastro` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `ativo` TINYINT(1) NOT NULL DEFAULT 1, PRIMARY KEY (`id_usuario`), UNIQUE KEY `uq_usuarios_user_name` (`user_name`), UNIQUE KEY `uq_usuarios_email` (`email`)) {TableOptions}""",
            $"""CREATE TABLE `funcionario` (`id_funcionario` CHAR(36) NOT NULL, `id_usuario` CHAR(36) NULL, `id_empresa` CHAR(36) NOT NULL, `nome` VARCHAR(160) NOT NULL, PRIMARY KEY (`id_funcionario`), CONSTRAINT `fk_funcionario_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT, CONSTRAINT `fk_funcionario_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE RESTRICT ON UPDATE RESTRICT, UNIQUE KEY `uq_funcionario_id_usuario` (`id_usuario`), KEY `idx_funcionario_id_empresa` (`id_empresa`), UNIQUE KEY `uq_funcionario_empresa_funcionario` (`id_empresa`, `id_funcionario`)) {TableOptions}""",
            "ALTER TABLE `loja` ADD UNIQUE KEY `uq_loja_empresa_loja` (`id_empresa`, `id_loja`)",
            $"""CREATE TABLE `funcionario_loja` (`id_funcionario_loja` CHAR(36) NOT NULL, `id_funcionario` CHAR(36) NOT NULL, `id_loja` CHAR(36) NOT NULL, `id_empresa` CHAR(36) NOT NULL, PRIMARY KEY (`id_funcionario_loja`), CONSTRAINT `fk_funcionario_loja_funcionario` FOREIGN KEY (`id_empresa`, `id_funcionario`) REFERENCES `funcionario` (`id_empresa`, `id_funcionario`) ON DELETE RESTRICT ON UPDATE RESTRICT, CONSTRAINT `fk_funcionario_loja_loja` FOREIGN KEY (`id_empresa`, `id_loja`) REFERENCES `loja` (`id_empresa`, `id_loja`) ON DELETE RESTRICT ON UPDATE RESTRICT, UNIQUE KEY `uq_funcionario_loja_funcionario_loja` (`id_funcionario`, `id_loja`), KEY `idx_funcionario_loja_empresa_funcionario` (`id_empresa`, `id_funcionario`), KEY `idx_funcionario_loja_empresa_loja` (`id_empresa`, `id_loja`), KEY `idx_funcionario_loja_id_loja` (`id_loja`)) {TableOptions}"""
        ],
        [
            "DROP TABLE `funcionario_loja`",
            "DROP TABLE `funcionario`",
            "DROP TABLE `usuarios`",
            "ALTER TABLE `loja` DROP INDEX `uq_loja_empresa_loja`"
        ]),

        new("003_perfis_permissoes.js",
        [
            $"""CREATE TABLE `perfis` (`id_perfil` CHAR(36) NOT NULL, `nome` VARCHAR(100) NOT NULL, `nome_normalizado` VARCHAR(100) NOT NULL, `concorrencia_stamp` CHAR(36) NOT NULL, PRIMARY KEY (`id_perfil`), UNIQUE KEY `uq_perfis_nome_normalizado` (`nome_normalizado`)) {TableOptions}""",
            $"""CREATE TABLE `usuario_perfis` (`id_usuario` CHAR(36) NOT NULL, `id_perfil` CHAR(36) NOT NULL, PRIMARY KEY (`id_usuario`, `id_perfil`), CONSTRAINT `fk_usuario_perfis_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT, CONSTRAINT `fk_usuario_perfis_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfis` (`id_perfil`) ON DELETE RESTRICT ON UPDATE RESTRICT, KEY `idx_usuario_perfis_id_perfil` (`id_perfil`)) {TableOptions}""",
            $"""CREATE TABLE `permissao` (`id_permissao` CHAR(36) NOT NULL, `nome` VARCHAR(120) NOT NULL, `descricao` VARCHAR(255) NULL, `modulo` VARCHAR(80) NOT NULL, PRIMARY KEY (`id_permissao`), UNIQUE KEY `uq_permissao_modulo_nome` (`modulo`, `nome`)) {TableOptions}""",
            $"""CREATE TABLE `usuario_claims` (`id_claim` CHAR(36) NOT NULL, `id_usuario` CHAR(36) NOT NULL, `claim_type` VARCHAR(100) NOT NULL, `claim_value` VARCHAR(255) NOT NULL, PRIMARY KEY (`id_claim`), CONSTRAINT `fk_usuario_claims_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT, UNIQUE KEY `uq_usuario_claims_usuario_tipo_valor` (`id_usuario`, `claim_type`, `claim_value`)) {TableOptions}"""
        ],
        [
            "DROP TABLE `usuario_claims`",
            "DROP TABLE `usuario_perfis`",
            "DROP TABLE `permissao`",
            "DROP TABLE `perfis`"
        ]),

        new("004_perfil_permissao.js",
        [
            $"""CREATE TABLE `perfil_permissao` (`id_perfil` CHAR(36) NOT NULL, `id_permissao` CHAR(36) NOT NULL, PRIMARY KEY (`id_perfil`, `id_permissao`), CONSTRAINT `fk_perfil_permissao_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfis` (`id_perfil`) ON DELETE RESTRICT ON UPDATE RESTRICT, CONSTRAINT `fk_perfil_permissao_permissao` FOREIGN KEY (`id_permissao`) REFERENCES `permissao` (`id_permissao`) ON DELETE RESTRICT ON UPDATE RESTRICT, KEY `idx_perfil_permissao_id_permissao` (`id_permissao`)) {TableOptions}"""
        ],
        [
            "DROP TABLE `perfil_permissao`"
        ]),

        new("005_autenticacao.js",
        [
            $"""CREATE TABLE `sessao_usuario` (`id_sessao` CHAR(36) NOT NULL, `id_usuario` CHAR(36) NOT NULL, `criada_em` DATETIME(6) NOT NULL, `ultimo_uso_em` DATETIME(6) NOT NULL, `expira_em` DATETIME(6) NOT NULL, `revogada_em` DATETIME(6) NULL, `motivo_revogacao` VARCHAR(64) NULL, `ip_inicial` VARCHAR(45) NULL, `user_agent` VARCHAR(255) NULL, `atualizada_em` DATETIME(6) NOT NULL, PRIMARY KEY (`id_sessao`), CONSTRAINT `fk_sessao_usuario_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE RESTRICT, KEY `idx_sessao_usuario_estado` (`id_usuario`, `revogada_em`, `expira_em`), KEY `idx_sessao_usuario_expira_em` (`expira_em`), CONSTRAINT `chk_sessao_usuario_expiracao` CHECK (`expira_em` > `criada_em`)) {TableOptions}""",
            $"""CREATE TABLE `token_refresh` (`id_token` CHAR(36) NOT NULL, `id_sessao` CHAR(36) NOT NULL, `token_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, `id_familia` CHAR(36) NOT NULL, `id_token_anterior` CHAR(36) NULL, `id_token_substituto` CHAR(36) NULL, `criado_em` DATETIME(6) NOT NULL, `expira_em` DATETIME(6) NOT NULL, `usado_em` DATETIME(6) NULL, `revogado_em` DATETIME(6) NULL, `motivo_revogacao` VARCHAR(64) NULL, `atualizado_em` DATETIME(6) NOT NULL, PRIMARY KEY (`id_token`), CONSTRAINT `fk_token_refresh_sessao` FOREIGN KEY (`id_sessao`) REFERENCES `sessao_usuario` (`id_sessao`) ON DELETE CASCADE ON UPDATE RESTRICT, UNIQUE KEY `uq_token_refresh_hash` (`token_hash`), UNIQUE KEY `uq_token_refresh_anterior` (`id_token_anterior`), KEY `idx_token_refresh_sessao_estado` (`id_sessao`, `revogado_em`, `expira_em`), KEY `idx_token_refresh_familia` (`id_familia`), KEY `idx_token_refresh_expira_em` (`expira_em`), CONSTRAINT `chk_token_refresh_expiracao` CHECK (`expira_em` > `criado_em`)) {TableOptions}""",
            $"""CREATE TABLE `tentativa_login` (`id_tentativa` CHAR(36) NOT NULL, `email_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, `id_usuario` CHAR(36) NULL, `sucesso` TINYINT(1) NOT NULL, `motivo` VARCHAR(40) NOT NULL, `ip_address` VARCHAR(45) NULL, `data_cadastro` DATETIME(6) NOT NULL, PRIMARY KEY (`id_tentativa`), CONSTRAINT `fk_tentativa_login_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE RESTRICT, KEY `idx_tentativa_login_email_janela` (`email_hash`, `data_cadastro`, `sucesso`), KEY `idx_tentativa_login_ip_janela` (`ip_address`, `data_cadastro`), KEY `idx_tentativa_login_data_cadastro` (`data_cadastro`)) {TableOptions}""",
            $"""CREATE TABLE `evento_seguranca` (`id_evento` CHAR(36) NOT NULL, `id_usuario` CHAR(36) NULL, `id_sessao` CHAR(36) NULL, `tipo_evento` VARCHAR(64) NOT NULL, `resultado` VARCHAR(20) NOT NULL, `metadata_json` VARCHAR(1000) NULL, `ip_address` VARCHAR(45) NULL, `data_cadastro` DATETIME(6) NOT NULL, PRIMARY KEY (`id_evento`), CONSTRAINT `fk_evento_seguranca_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE RESTRICT, CONSTRAINT `fk_evento_seguranca_sessao` FOREIGN KEY (`id_sessao`) REFERENCES `sessao_usuario` (`id_sessao`) ON DELETE SET NULL ON UPDATE RESTRICT, KEY `idx_evento_seguranca_usuario_data` (`id_usuario`, `data_cadastro`), KEY `idx_evento_seguranca_sessao_data` (`id_sessao`, `data_cadastro`), KEY `idx_evento_seguranca_tipo_data` (`tipo_evento`, `data_cadastro`), CONSTRAINT `chk_evento_seguranca_resultado` CHECK (`resultado` IN ('success', 'failure', 'denied'))) {TableOptions}"""
        ],
        [
            "DROP TABLE `evento_seguranca`",
            "DROP TABLE `tentativa_login`",
            "DROP TABLE `token_refresh`",
            "DROP TABLE `sessao_usuario`"
        ])
    ];
}
