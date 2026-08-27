import 'dotenv/config';
import knexFactory from 'knex';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('Refusing to run development seeds unless NODE_ENV=development');
}

const { default: configuration } = await import('./knexfile.js');
const knex = knexFactory(configuration);
try {
  await knex.seed.run();
  console.log('Development seeds completed');
} finally {
  await knex.destroy();
}
