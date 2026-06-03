# Finanzas familiares

Aplicacion Next.js para controlar ingresos y gastos mensuales en pesos argentinos y dolares.

## Comandos

```bash
npm run dev
npm run build
npm run lint
```

Para probar desde un celular en la misma red:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Despues entra desde el telefono a `http://IP-DE-TU-PC:3000`.

## Base de datos

La app usa Postgres. Agrega tu URL de conexion en `.env` para desarrollo local y en las variables de entorno del deploy:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=verify-full"
```

La primera visita crea las tablas necesarias si todavia no existen. Si tenes datos en `prisma/dev.db`, podes migrarlos a Postgres con:

```bash
npm run db:migrate:local-to-postgres
```

Prisma genera el cliente con:

```bash
npm run db:generate
```

## Acceso privado

Configura dos usuarios permitidos y un secreto de sesion:

```bash
FINANZA_SESSION_SECRET="un-secreto-largo-y-random"
FINANZA_AUTH_USERS="mario:contrasena-de-mario,esposa:contrasena-de-esposa"
```

Para guardar contrasenas hasheadas en vez de texto plano:

```bash
npm run auth:hash -- "tu-contrasena"
```
