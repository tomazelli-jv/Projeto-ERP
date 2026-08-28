export class OnboardingRepository {
  async findPlanByCode(connection, code) {
    const [rows] = await connection.execute(
      `SELECT id, code, is_active AS isActive, is_public AS isPublic
         FROM plans
        WHERE code = ?
        LIMIT 1
        LOCK IN SHARE MODE`,
      [code]
    );
    return rows[0] ?? null;
  }

  async findPlanLimits(connection, planId) {
    const [rows] = await connection.execute('SELECT `key`, `value` FROM plan_limits WHERE plan_id = ?', [
      planId
    ]);
    return rows;
  }

  async createTenant(connection, data) {
    await connection.execute(
      'INSERT INTO tenants (id, name, slug, status, timezone, locale) VALUES (?, ?, ?, ?, ?, ?)',
      [data.id, data.name, data.slug, data.status, data.timezone, data.locale]
    );
  }

  async createCompany(connection, data) {
    await connection.execute(
      'INSERT INTO companies (id, tenant_id, legal_name, trade_name, tax_id_root, status) VALUES (?, ?, ?, ?, ?, ?)',
      [data.id, data.tenantId, data.legalName, data.tradeName, data.taxIdRoot, data.status]
    );
  }

  async createBranch(connection, data) {
    await connection.execute(
      `INSERT INTO branches
        (id, tenant_id, company_id, code, legal_name, trade_name, tax_id, is_headquarters, status, email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.tenantId,
        data.companyId,
        data.code,
        data.legalName,
        data.tradeName,
        data.taxId,
        data.isHeadquarters,
        data.status,
        data.email,
        data.phone
      ]
    );
  }

  async createBranchAddress(connection, data) {
    await connection.execute(
      `INSERT INTO branch_addresses
        (id, tenant_id, branch_id, postal_code, street, number, complement, district, city, state, country_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.tenantId,
        data.branchId,
        data.postalCode,
        data.street,
        data.number,
        data.complement,
        data.district,
        data.city,
        data.state,
        data.countryCode
      ]
    );
  }

  async findUserByEmailForUpdate(connection, email) {
    const [rows] = await connection.execute(
      'SELECT id, name, email, phone FROM users WHERE email = ? LIMIT 1 FOR UPDATE',
      [email]
    );
    return rows[0] ?? null;
  }

  async createUserIfMissing(connection, data) {
    await connection.execute(
      `INSERT INTO users (id, name, email, phone)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [data.id, data.name, data.email, data.phone]
    );
  }

  async createMembership(connection, data) {
    await connection.execute(
      `INSERT INTO tenant_memberships
        (id, tenant_id, user_id, status, is_owner, joined_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.id, data.tenantId, data.userId, data.status, data.isOwner, data.joinedAt]
    );
  }

  async createSubscription(connection, data) {
    await connection.execute(
      `INSERT INTO subscriptions
        (id, tenant_id, plan_id, status, starts_at, trial_ends_at, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.tenantId, data.planId, data.status, data.startsAt, data.trialEndsAt, data.endsAt]
    );
  }
}
