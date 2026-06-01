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

La app usa Postgres en produccion. En Vercel, crea o conecta una base Postgres/Neon y agrega la variable:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
```

La primera visita crea las tablas necesarias si todavia no existen.

Prisma genera el cliente con:

```bash
npm run db:generate
```
