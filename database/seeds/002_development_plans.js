import { randomUUID } from 'node:crypto';

const developmentPlans = [
  {
    code: 'STARTER',
    name: 'Starter',
    description: 'Plano inicial de desenvolvimento; não representa oferta comercial definitiva.',
    limits: { max_companies: 1, max_branches: 2, max_users: 5 }
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Plano intermediário de desenvolvimento; não representa oferta comercial definitiva.',
    limits: { max_companies: 3, max_branches: 10, max_users: 25 }
  },
  {
    code: 'BUSINESS',
    name: 'Business',
    description: 'Plano avançado de desenvolvimento; não representa oferta comercial definitiva.',
    limits: { max_companies: 10, max_branches: 50, max_users: 100 }
  }
];

export async function seed(knex) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Development seeds can only run with NODE_ENV=development');
  }

  await knex.transaction(async (transaction) => {
    for (const plan of developmentPlans) {
      let existing = await transaction('plans').select('id').where({ code: plan.code }).first();
      if (!existing) {
        existing = { id: randomUUID() };
        await transaction('plans').insert({
          id: existing.id,
          code: plan.code,
          name: plan.name,
          description: plan.description,
          is_active: true,
          is_public: true
        });
      } else {
        await transaction('plans')
          .where({ id: existing.id })
          .update({
            name: plan.name,
            description: plan.description,
            is_public: true,
            updated_at: transaction.fn.now(6)
          });
      }

      for (const [key, value] of Object.entries(plan.limits)) {
        const currentLimit = await transaction('plan_limits')
          .select('id')
          .where({ plan_id: existing.id, key })
          .first();
        if (currentLimit) {
          await transaction('plan_limits')
            .where({ id: currentLimit.id })
            .update({
              value,
              updated_at: transaction.fn.now(6)
            });
        } else {
          await transaction('plan_limits').insert({ id: randomUUID(), plan_id: existing.id, key, value });
        }
      }
    }
  });
}
