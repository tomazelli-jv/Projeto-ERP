import argon2 from 'argon2';
import { argon2Config } from '../../config/password-security.js';

export class PasswordHasher {
  constructor(config = argon2Config) {
    this.config = config;
  }

  async hash(password) {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.config.memoryCost,
      timeCost: this.config.timeCost,
      parallelism: this.config.parallelism,
      hashLength: this.config.hashLength
    });
  }

  async verify(passwordHash, password) {
    return argon2.verify(passwordHash, password);
  }
}
