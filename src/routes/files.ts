import { Router } from "express";
import multer from "multer";
import { FileController } from "../controllers/FileController";

const router = Router();

// Configuração do Multer para receber arquivos em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de arquivo permitidos
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/pdf",
    ];
    const allowedExtensions = [".docx", ".pdf"];

    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (
      allowedTypes.includes(file.mimetype) ||
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Tipo de arquivo não suportado. Apenas DOCX e PDF são permitidos."
        )
      );
    }
  },
});

/**
 * POST /api/files/upload
 * Upload inteligente - determina automaticamente se é edição ou nova versão
 */
router.post("/upload", upload.single("file"), FileController.uploadFile);

/**
 * POST /api/files/new-version
 * Força criação de nova versão
 */
router.post(
  "/new-version",
  upload.single("file"),
  FileController.uploadNewVersion
);

/**
 * POST /api/files/edit
 * Força edição de versão existente
 */
router.post("/edit", upload.single("file"), FileController.uploadEdit);

/**
 * GET /api/files/:manualId/:versionSeq/can-edit
 * Verifica se uma versão pode ser editada
 */
router.get("/:manualId/:versionSeq/can-edit", FileController.canEditFile);

/**
 * GET /api/files/:manualId/versions
 * Lista todas as versões de um manual (para seu outro backend)
 */
router.get("/:manualId/versions", FileController.listVersions);

/**
 * GET /api/files/:manualId/versions/:versionSeq/:format
 * Busca versão específica (para seu outro backend)
 */
router.get(
  "/:manualId/versions/:versionSeq/:format",
  FileController.getVersion
);

/**
 * GET /api/files/:manualId/permissions
 * Verifica permissões de usuário (para seu outro backend)
 */
router.get("/:manualId/permissions", FileController.checkUserPermissions);

/**
 * GET /api/files/:manualId/metadata
 * Busca metadados completos do manual (para seu outro backend)
 */
router.get("/:manualId/metadata", FileController.getManualMetadata);

/**
 * POST /api/files/:manualId/versions/:versionSeq/lock
 * Criar lock de edição (para seu outro backend)
 */
router.post(
  "/:manualId/versions/:versionSeq/lock",
  FileController.createEditLock
);

/**
 * GET /api/files/:manualId/versions/:versionSeq/lock
 * Verificar status do lock (para seu outro backend)
 */
router.get(
  "/:manualId/versions/:versionSeq/lock",
  FileController.checkLockStatus
);

/**
 * DELETE /api/files/:manualId/versions/:versionSeq/lock
 * Remover lock de edição (para seu outro backend)
 */
router.delete(
  "/:manualId/versions/:versionSeq/lock",
  FileController.removeEditLock
);

/**
 * GET /api/files/locks
 * Listar todos os locks ativos (para seu outro backend)
 */
router.get("/locks", FileController.listActiveLocks);

/**
 * NOVO: GET /api/files/:manualId/versions/:versionSeq/co-editing/users
 * Obter usuários atualmente editando (co-edição)
 */
router.get(
  "/:manualId/versions/:versionSeq/co-editing/users",
  FileController.getCoEditingUsers
);

/**
 * NOVO: POST /api/files/:manualId/versions/:versionSeq/co-editing/end
 * Finalizar sessão de co-edição
 */
router.post(
  "/:manualId/versions/:versionSeq/co-editing/end",
  FileController.endCoEditingSession
);

/**
 * NOVO: GET /api/files/:manualId/versions/:versionSeq/co-editing/status
 * Verificar se há sessão de co-edição ativa
 */
router.get(
  "/:manualId/versions/:versionSeq/co-editing/status",
  FileController.checkCoEditingSession
);

/**
 * NOVO: GET /api/files/:manualId/versions/:versionSeq/:format/download
 * Download de arquivo (para seu outro backend)
 */
router.get(
  "/:manualId/versions/:versionSeq/:format/download",
  FileController.downloadFile
);

/**
 * GET /api/files/health
 * Health check da API
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "API de arquivos funcionando",
    timestamp: new Date().toISOString(),
  });
});

export default router;
