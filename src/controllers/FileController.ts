import { Request, Response } from "express";
import { FileService } from "../services/FileService";
import { VersioningService } from "../services/VersioningService";
import { FileUploadRequest, FileUploadResponse } from "../types";
import { ManualRepository } from "../repositories/ManualRepository";
import { ManualVersionRepository } from "../repositories/ManualVersionRepository";
import { LockService } from "../services/LockService";

export class FileController {
  /**
   * Upload de arquivo - determina se é edição ou nova versão
   */
  static async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se há arquivo
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Nenhum arquivo foi enviado",
        });
        return;
      }

      // Extrair dados do request
      const {
        manualId,
        versionSeq,
        format,
        changelog,
        isNewVersion,
        username,
      } = req.body;

      // Validar dados obrigatórios
      if (!manualId || !format || !username) {
        res.status(400).json({
          success: false,
          message: "manualId, format e username são obrigatórios",
        });
        return;
      }

      // Validar formato
      if (!["docx", "pdf"].includes(format.toLowerCase())) {
        res.status(400).json({
          success: false,
          message: "Formato deve ser docx ou pdf",
        });
        return;
      }

      // Buscar dados reais do banco
      const currentManual = await ManualRepository.findById(manualId);
      if (!currentManual) {
        res.status(404).json({
          success: false,
          message: "Manual não encontrado",
        });
        return;
      }

      // VERIFICAR LOCK DE EDIÇÃO (NOVO!)
      const targetVersion = versionSeq || currentManual.latest_version_seq || 1;
      const lockCheck = await LockService.canEdit(
        manualId,
        targetVersion,
        username
      );

      if (!lockCheck.canEdit) {
        res.status(423).json({
          // 423 = Locked
          success: false,
          message: lockCheck.reason,
          lockedBy: lockCheck.locker,
          expiresAt: lockCheck.expiresAt,
        });
        return;
      }

      // Determinar se deve criar nova versão
      const shouldCreateNew = VersioningService.shouldCreateNewVersion(
        {
          manualId,
          versionSeq,
          format,
          changelog,
          isNewVersion: isNewVersion === "true",
        },
        currentManual
      );

      // Processar upload
      const result = await FileService.processFileUpload(
        req.file.buffer,
        req.file.originalname,
        {
          manualId,
          versionSeq: shouldCreateNew ? undefined : versionSeq,
          format: format.toLowerCase() as "docx" | "pdf",
          changelog,
          isNewVersion: shouldCreateNew,
        },
        username,
        currentManual.latest_version_seq || 0
      );

      if (result.success) {
        // REMOVER LOCK após upload bem-sucedido (NOVO!)
        if (!shouldCreateNew) {
          await LockService.removeLock(manualId, targetVersion, username);
        }

        res.status(200).json({
          ...result,
          action: shouldCreateNew ? "new_version" : "edit_version",
          versionNumber: result.version?.version_seq,
          lockRemoved: !shouldCreateNew,
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Upload de nova versão (força criação de nova versão)
   */
  static async uploadNewVersion(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Nenhum arquivo foi enviado",
        });
        return;
      }

      const { manualId, format, changelog, username } = req.body;

      if (!manualId || !format || !username) {
        res.status(400).json({
          success: false,
          message: "manualId, format e username são obrigatórios",
        });
        return;
      }

      // Força nova versão
      const result = await FileService.processFileUpload(
        req.file.buffer,
        req.file.originalname,
        {
          manualId,
          format: format.toLowerCase() as "docx" | "pdf",
          changelog,
          isNewVersion: true,
        },
        req.body.username || "anonymous",
        0 // Será incrementado automaticamente
      );

      if (result.success) {
        res.status(200).json({
          ...result,
          action: "new_version_forced",
          versionNumber: result.version?.version_seq,
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Erro no upload de nova versão:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Upload de edição (atualiza versão existente)
   */
  static async uploadEdit(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Nenhum arquivo foi enviado",
        });
        return;
      }

      const { manualId, versionSeq, format, changelog, username } = req.body;

      if (!manualId || !versionSeq || !format || !username) {
        res.status(400).json({
          success: false,
          message: "manualId, versionSeq, format e username são obrigatórios",
        });
        return;
      }

      // Força edição da versão especificada
      const result = await FileService.processFileUpload(
        req.file.buffer,
        req.file.originalname,
        {
          manualId,
          versionSeq: parseInt(versionSeq),
          format: format.toLowerCase() as "docx" | "pdf",
          changelog,
          isNewVersion: false,
        },
        req.body.username || "anonymous",
        parseInt(versionSeq)
      );

      if (result.success) {
        res.status(200).json({
          ...result,
          action: "edit_version",
          versionNumber: result.version?.version_seq,
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Erro no upload de edição:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Verificar se arquivo pode ser editado
   */
  static async canEditFile(req: Request, res: Response): Promise<void> {
    try {
      const { manualId, versionSeq } = req.params;

      // Buscar dados reais do banco
      const manual = await ManualRepository.findById(manualId);
      if (!manual) {
        res.status(404).json({
          success: false,
          message: "Manual não encontrado",
        });
        return;
      }

      const canEdit = FileService.canEditVersion(
        manual.state,
        parseInt(versionSeq),
        manual.published_version_seq
      );

      res.status(200).json({
        canEdit,
        reason: canEdit
          ? "Versão pode ser editada"
          : "Versão não pode ser editada",
      });
    } catch (error) {
      console.error("Erro ao verificar permissão de edição:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Listar todas as versões de um manual (para seu outro backend)
   */
  static async listVersions(req: Request, res: Response): Promise<void> {
    try {
      const { manualId } = req.params;

      // Verificar se manual existe
      const manual = await ManualRepository.findById(manualId);
      if (!manual) {
        res.status(404).json({
          success: false,
          message: "Manual não encontrado",
        });
        return;
      }

      // Buscar todas as versões
      const versions = await ManualRepository.getVersions(manualId);

      res.status(200).json({
        success: true,
        manual: {
          id: manual.id,
          title: manual.title,
          state: manual.state,
          latest_version_seq: manual.latest_version_seq,
          published_version_seq: manual.published_version_seq,
        },
        versions: versions,
      });
    } catch (error) {
      console.error("Erro ao listar versões:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Buscar versão específica (para seu outro backend)
   */
  static async getVersion(req: Request, res: Response): Promise<void> {
    try {
      const { manualId, versionSeq, format } = req.params;

      // Verificar se versão existe
      const version = await ManualVersionRepository.findByVersion(
        manualId,
        parseInt(versionSeq),
        format
      );

      if (!version) {
        res.status(404).json({
          success: false,
          message: "Versão não encontrada",
        });
        return;
      }

      res.status(200).json({
        success: true,
        version: version,
      });
    } catch (error) {
      console.error("Erro ao buscar versão:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Verificar permissões de usuário (para seu outro backend)
   */
  static async checkUserPermissions(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { manualId } = req.params;
      const { username } = req.query;

      if (!username) {
        res.status(400).json({
          success: false,
          message: "Username é obrigatório",
        });
        return;
      }

      const canEdit = await ManualRepository.canUserEdit(
        manualId,
        username as string
      );

      res.status(200).json({
        success: true,
        manualId,
        username,
        canEdit,
        permissions: {
          read: true, // Todos podem ler
          edit: canEdit,
          approve: canEdit, // Simplificado - em produção seria mais granular
          admin: canEdit, // Simplificado
        },
      });
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Buscar metadados do manual (para seu outro backend)
   */
  static async getManualMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { manualId } = req.params;

      const manual = await ManualRepository.findById(manualId);
      if (!manual) {
        res.status(404).json({
          success: false,
          message: "Manual não encontrado",
        });
        return;
      }

      const latestVersion = await ManualRepository.getLatestVersion(manualId);
      const publishedVersion =
        await ManualVersionRepository.getPublishedVersion(manualId);

      res.status(200).json({
        success: true,
        manual: {
          id: manual.id,
          title: manual.title,
          slug: manual.slug,
          state: manual.state,
          owner_username: manual.owner_username,
          created_at: manual.created_at,
          updated_at: manual.updated_at,
        },
        versions: {
          latest: latestVersion,
          published: publishedVersion,
          total_count: latestVersion ? latestVersion.version_seq : 0,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar metadados:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Criar lock de edição (para seu outro backend)
   */
  static async createEditLock(req: Request, res: Response): Promise<void> {
    try {
      const { manualId, versionSeq } = req.params;
      const {
        username,
        timeoutMinutes = 30,
        enableCoEditing = false,
      } = req.body;

      if (!username) {
        res.status(400).json({
          success: false,
          message: "Username é obrigatório",
        });
        return;
      }

      const result = await LockService.createEditLock(
        manualId,
        parseInt(versionSeq),
        username,
        timeoutMinutes,
        enableCoEditing
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          lockId: result.lockId,
          sessionId: result.sessionId,
          isCoEditing: enableCoEditing,
        });
      } else {
        res.status(423).json({
          // 423 = Locked
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Erro ao criar lock:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Verificar status do lock (para seu outro backend)
   */
  static async checkLockStatus(req: Request, res: Response): Promise<void> {
    try {
      const { manualId, versionSeq } = req.params;
      const { username } = req.query;

      if (!username) {
        res.status(400).json({
          success: false,
          message: "Username é obrigatório",
        });
        return;
      }

      const lockStatus = await LockService.canEdit(
        manualId,
        parseInt(versionSeq),
        username as string
      );

      res.status(200).json({
        success: true,
        ...lockStatus,
      });
    } catch (error) {
      console.error("Erro ao verificar lock:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Remover lock de edição (para seu outro backend)
   */
  static async removeEditLock(req: Request, res: Response): Promise<void> {
    try {
      const { manualId, versionSeq } = req.params;
      const { username } = req.body;

      if (!username) {
        res.status(400).json({
          success: false,
          message: "Username é obrigatório",
        });
        return;
      }

      const success = await LockService.removeLock(
        manualId,
        parseInt(versionSeq),
        username
      );

      if (success) {
        res.status(200).json({
          success: true,
          message: "Lock removido com sucesso",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Lock não encontrado ou não pertence ao usuário",
        });
      }
    } catch (error) {
      console.error("Erro ao remover lock:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * Listar todos os locks ativos (para seu outro backend)
   */
  static async listActiveLocks(req: Request, res: Response): Promise<void> {
    try {
      const locks = await LockService.listActiveLocks();

      res.status(200).json({
        success: true,
        locks: locks,
        total: locks.length,
      });
    } catch (error) {
      console.error("Erro ao listar locks:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * NOVO: Obter usuários atualmente editando (co-edição)
   */
  static async getCoEditingUsers(req: Request, res: Response): Promise<void> {
    try {
      const { manualId, versionSeq } = req.params;

      const users = await LockService.getCoEditingUsers(
        manualId,
        parseInt(versionSeq)
      );

      res.status(200).json({
        success: true,
        manualId,
        versionSeq,
        coEditingUsers: users,
        totalUsers: users.length,
      });
    } catch (error) {
      console.error("Erro ao buscar usuários de co-edição:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * NOVO: Finalizar sessão de co-edição
   */
  static async endCoEditingSession(req: Request, res: Response): Promise<void> {
    try {
      const { manualId, versionSeq } = req.params;
      const { sessionId, username } = req.body;

      if (!sessionId || !username) {
        res.status(400).json({
          success: false,
          message: "sessionId e username são obrigatórios",
        });
        return;
      }

      const success = await LockService.endCoEditingSession(
        manualId,
        parseInt(versionSeq),
        sessionId
      );

      if (success) {
        res.status(200).json({
          success: true,
          message: "Sessão de co-edição finalizada com sucesso",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Sessão de co-edição não encontrada",
        });
      }
    } catch (error) {
      console.error("Erro ao finalizar sessão de co-edição:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * NOVO: Verificar se há sessão de co-edição ativa
   */
  static async checkCoEditingSession(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { manualId, versionSeq } = req.params;

      const hasSession = await LockService.hasActiveCoEditingSession(
        manualId,
        parseInt(versionSeq)
      );

      res.status(200).json({
        success: true,
        manualId,
        versionSeq,
        hasCoEditingSession: hasSession,
      });
    } catch (error) {
      console.error("Erro ao verificar sessão de co-edição:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * NOVO: Download de arquivo (para seu outro backend)
   */
  static async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { manualId, versionSeq, format } = req.params;

      // Buscar versão com dados do arquivo
      const version = await ManualVersionRepository.findByVersion(
        manualId,
        parseInt(versionSeq),
        format
      );

      if (!version) {
        res.status(404).json({
          success: false,
          message: "Versão não encontrada",
        });
        return;
      }

      if (!version.file_data) {
        res.status(404).json({
          success: false,
          message: "Arquivo não encontrado",
        });
        return;
      }

      // Configurar headers para download
      const fileName = `manual_${manualId}_v${versionSeq}.${format}`;
      const mimeType =
        format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";

      res.setHeader("Content-Type", mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.setHeader("Content-Length", version.size_bytes.toString());

      // Enviar arquivo
      res.send(version.file_data);
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
}
