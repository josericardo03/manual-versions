import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import multer from "multer";
import filesRouter from "./routes/files";
import { testConnection } from "./config/database";

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança
app.use(helmet());
app.use(cors());

// Middleware para parsing de JSON
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Middleware de logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas
app.use("/api/files", filesRouter);

// Rota raiz
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Sistema de Versionamento de Manuais",
    version: "1.0.0",
    endpoints: {
      files: "/api/files",
      health: "/api/files/health",
    },
  });
});

// Middleware de tratamento de erros
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Erro:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Arquivo muito grande. Tamanho máximo: 50MB",
      });
    }
  }

  res.status(500).json({
    success: false,
    message: "Erro interno do servidor",
  });
});

// Middleware para rotas não encontradas
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada",
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 API de arquivos: http://localhost:${PORT}/api/files`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/files/health`);

  // Testar conexão com banco
  try {
    await testConnection();
  } catch (error) {
    console.error("❌ Falha na conexão com banco de dados");
  }
});

export default app;
