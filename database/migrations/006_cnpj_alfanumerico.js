// ASCII ranges make the CHECK independent from the table's case-insensitive collation.
const character = (position) => `ASCII(SUBSTRING(\`documento\`, ${position}, 1))`;
const alphanumericPosition = (position) =>
  `((${character(position)} BETWEEN 48 AND 57) OR (${character(position)} BETWEEN 65 AND 90))`;
const numericPosition = (position) => `(${character(position)} BETWEEN 48 AND 57)`;
const alphanumericCheck =
  `CHAR_LENGTH(\`documento\`) = 14 AND ` +
  [...Array(12)].map((_, index) => alphanumericPosition(index + 1)).join(' AND ') +
  ` AND ${numericPosition(13)} AND ${numericPosition(14)}`;
const legacyNumericCheck =
  `CHAR_LENGTH(\`documento\`) = 14 AND ` +
  [...Array(14)].map((_, index) => numericPosition(index + 1)).join(' AND ');

export async function up(knex) {
  // The historical numeric constraint is replaced without changing VARCHAR(14) or its global UNIQUE index.
  await knex.raw('ALTER TABLE `loja` DROP CONSTRAINT `chk_loja_documento`');
  await knex.raw(
    `ALTER TABLE \`loja\` ADD CONSTRAINT \`chk_loja_documento_alfanumerico\` CHECK (${alphanumericCheck})`
  );
}

export async function down(knex) {
  // Adding the legacy CHECK first makes rollback fail safely when alphanumeric data exists; no document is deleted or converted.
  await knex.raw(`ALTER TABLE \`loja\` ADD CONSTRAINT \`chk_loja_documento\` CHECK (${legacyNumericCheck})`);
  await knex.raw('ALTER TABLE `loja` DROP CONSTRAINT `chk_loja_documento_alfanumerico`');
}
