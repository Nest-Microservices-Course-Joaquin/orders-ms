## Dev

1. Clonar el proyecto
2. Crear un archivo `.env` basado en el `.env.template`
3. Levantar la base de datos con `docker compose up -d`
4. Levantar el servidor de Nats

```
docker run -d --name nats-server -p 4222:4222 -p 8222:8222 nats
```

5. Levantar el proyecto con `pnpm run start:dev`