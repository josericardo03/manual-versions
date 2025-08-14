import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const dbPool = new Pool({
  host: process.env.DB_HOST || "192.168.10.17",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "manuais",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "12345678",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testar conexão
export async function testConnection() {
  try {
    const client = await dbPool.connect();
    console.log("✅ Conectado ao PostgreSQL:", process.env.DB_NAME);
    client.release();
  } catch (error) {
    console.error("❌ Erro ao conectar ao PostgreSQL:", error);
    throw error;
  }
}
