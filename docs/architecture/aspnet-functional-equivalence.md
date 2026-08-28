# ASP.NET functional equivalence: onboarding and initial password

The ASP.NET API preserves the public Express routes and envelopes for tenant
onboarding and initial password setup. Both implementations use the same
MariaDB schema and migration ledger while the migration branch is being
validated.

## Stable contracts

- `POST /api/v1/onboarding` returns HTTP 201 and `{ "data": ... }`.
- `POST /api/v1/auth/password/setup/confirm` returns HTTP 200 and
  `{ "data": { "passwordDefined": true } }`.
- Invalid input uses `VALIDATION_ERROR`; unknown properties are rejected at
  every object level.
- Private token states are intentionally collapsed to the public
  `PASSWORD_SETUP_TOKEN_INVALID` response.
- The password endpoint is limited to five attempts per IP per 15 minutes.

Variable UUIDs, UTC timestamps, raw notification tokens, salts, and Argon2id
hashes must be normalized when comparing test output. They are not public
contract differences.

## Transaction boundaries

Onboarding validates and normalizes input before opening a connection. Every
database write, including the password-setup token hash, occurs in one
transaction. Notification delivery starts only after commit. Deadlocks and
transient check/read conflicts retry the complete transaction with a new
connection, up to three attempts.

Password setup locks the token and user, creates one credential, consumes the
token atomically, revokes sibling tokens, and commits as one transaction.
Concurrent consumption therefore produces exactly one success.

Only SHA-256 token hashes are stored. Passwords use Argon2id PHC strings with
`m=19456`, `t=2`, `p=1`, a 16-byte salt, and a 32-byte hash. Neither request
secrets nor connection strings are included in application logs.
