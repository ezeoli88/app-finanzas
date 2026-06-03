import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run auth:hash -- "tu-contrasena"');
  process.exitCode = 1;
} else {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");

  console.log(`scrypt$${salt}$${hash}`);
}
