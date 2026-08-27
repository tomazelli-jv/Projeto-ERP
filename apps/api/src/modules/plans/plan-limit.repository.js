import { planLimitKeySchema, uuidSchema } from '@tomazelli/shared';

export class PlanLimitRepository {
  constructor(database) {
    this.database = database;
  }

  async findCurrentLimit(tenantId, key) {
    uuidSchema.parse(tenantId);
    planLimitKeySchema.parse(key);

    const [rows] = await this.database.execute(
      `SELECT plan_limits.\`value\`
         FROM subscriptions
         INNER JOIN plan_limits ON plan_limits.plan_id = subscriptions.plan_id
        WHERE subscriptions.tenant_id = ?
          AND subscriptions.status IN ('trialing', 'active', 'suspended')
          AND plan_limits.\`key\` = ?
        LIMIT 1`,
      [tenantId, key]
    );

    if (!rows.length) return null;
    const value = Number(rows[0].value);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Invalid stored value for plan limit: ${key}`);
    }
    return value;
  }
}
