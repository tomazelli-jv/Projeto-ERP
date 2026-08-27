export class PasswordSetupRepository {
  async findUserByIdForUpdate(connection, userId) {
    const [rows] = await connection.execute('SELECT id, email FROM users WHERE id = ? LIMIT 1 FOR UPDATE', [
      userId
    ]);
    return rows[0] ?? null;
  }

  async findCredentialByUserId(connection, userId) {
    const [rows] = await connection.execute('SELECT id FROM user_credentials WHERE user_id = ? LIMIT 1', [
      userId
    ]);
    return rows[0] ?? null;
  }

  async revokeActiveTokens(connection, { userId, purpose, revokedAt }) {
    const [result] = await connection.execute(
      `UPDATE password_setup_tokens
          SET revoked_at = ?, updated_at = ?
        WHERE user_id = ? AND purpose = ? AND used_at IS NULL AND revoked_at IS NULL`,
      [revokedAt, revokedAt, userId, purpose]
    );
    return result.affectedRows;
  }

  async createToken(connection, data) {
    await connection.execute(
      `INSERT INTO password_setup_tokens
        (id, user_id, token_hash, purpose, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.userId, data.tokenHash, data.purpose, data.expiresAt, data.createdAt, data.createdAt]
    );
  }

  async findTokenByHashForUpdate(connection, tokenHash) {
    const [rows] = await connection.execute(
      `SELECT id, user_id AS userId, purpose, expires_at AS expiresAt,
              used_at AS usedAt, revoked_at AS revokedAt
         FROM password_setup_tokens
        WHERE token_hash = ?
        LIMIT 1
        FOR UPDATE`,
      [tokenHash]
    );
    return rows[0] ?? null;
  }

  async createCredential(connection, data) {
    await connection.execute(
      `INSERT INTO user_credentials (id, user_id, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [data.id, data.userId, data.passwordHash, data.createdAt, data.createdAt]
    );
  }

  async markTokenUsed(connection, { tokenId, usedAt }) {
    const [result] = await connection.execute(
      `UPDATE password_setup_tokens
          SET used_at = ?, updated_at = ?
        WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL`,
      [usedAt, usedAt, tokenId]
    );
    return result.affectedRows;
  }
}
