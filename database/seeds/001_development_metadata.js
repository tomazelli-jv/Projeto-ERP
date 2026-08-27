export async function seed(knex) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Development seeds can only run with NODE_ENV=development');
  }

  await knex('system_metadata')
    .insert({ metadata_key: 'development_seed', metadata_value: 'applied' })
    .onConflict('metadata_key')
    .merge({ metadata_value: 'applied', updated_at: knex.fn.now(6) });
}
