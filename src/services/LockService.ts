import { dbPool } from "../config/database";

export interface EditLock {
  manual_id: string;
  version_seq: number;
  locker_username: string;
  doc_key: string;
  expires_at: Date;
  created_at: Date;
  is_co_editing: boolean; // NOVO: indica se é co-edição
  co_editing_session_id: string; // NOVO: ID da sessão de co-edição
}

export interface LockStatus {
  canEdit: boolean;
  reason: string;
  locker?: string;
  expiresAt?: Date;
  lockId?: string;
}

export class LockService {
  /**
   * Cria lock de edição (suporte a co-edição)
   */
  static async createEditLock(
    manualId: string,
    versionSeq: number,
    username: string,
    timeoutMinutes: number = 30,
    enableCoEditing: boolean = false
  ): Promise<{
    success: boolean;
    message: string;
    lockId?: string;
    sessionId?: string;
  }> {
    try {
      // Verificar se já existe lock ativo
      const existingLock = await this.getActiveLock(manualId, versionSeq);

      if (existingLock) {
        // Se o lock é do próprio usuário, renova
        if (existingLock.locker_username === username) {
          const renewed = await this.renewLock(
            manualId,
            versionSeq,
            timeoutMinutes
          );
          if (renewed) {
            return {
              success: true,
              message: "Lock renovado com sucesso",
              lockId: existingLock.doc_key,
              sessionId: existingLock.co_editing_session_id,
            };
          }
        }

        // NOVO: Se co-edição está habilitada, permitir múltiplos usuários
        if (enableCoEditing && existingLock.is_co_editing) {
          // Juntar à sessão de co-edição existente
          const sessionId = existingLock.co_editing_session_id;
          const newLockKey = `lock_${manualId}_${versionSeq}_${Date.now()}_${username}`;
          const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

          await dbPool.query(
            `
            INSERT INTO edit_locks (manual_id, version_seq, locker_username, doc_key, expires_at, created_at, is_co_editing, co_editing_session_id)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
          `,
            [
              manualId,
              versionSeq,
              username,
              newLockKey,
              expiresAt,
              true,
              sessionId,
            ]
          );

          return {
            success: true,
            message: `Juntou-se à sessão de co-edição com ${existingLock.locker_username}`,
            lockId: newLockKey,
            sessionId: sessionId,
          };
        }

        return {
          success: false,
          message: `Arquivo sendo editado por ${existingLock.locker_username}`,
        };
      }

      // Criar novo lock (primeiro usuário)
      const lockKey = `lock_${manualId}_${versionSeq}_${Date.now()}_${username}`;
      const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
      const sessionId = enableCoEditing
        ? `session_${manualId}_${versionSeq}_${Date.now()}`
        : `single_${Date.now()}`;

      await dbPool.query(
        `
        INSERT INTO edit_locks (manual_id, version_seq, locker_username, doc_key, expires_at, created_at, is_co_editing, co_editing_session_id)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      `,
        [
          manualId,
          versionSeq,
          username,
          lockKey,
          expiresAt,
          enableCoEditing,
          sessionId,
        ]
      );

      return {
        success: true,
        message: enableCoEditing
          ? "Sessão de co-edição criada com sucesso"
          : "Lock de edição criado com sucesso",
        lockId: lockKey,
        sessionId: sessionId,
      };
    } catch (error) {
      console.error("Erro ao criar lock:", error);
      return {
        success: false,
        message: "Erro interno ao criar lock",
      };
    }
  }

  /**
   * Verifica se pode editar (suporte a co-edição)
   */
  static async canEdit(
    manualId: string,
    versionSeq: number,
    username: string
  ): Promise<LockStatus> {
    try {
      const locks = await this.getActiveLocksForVersion(manualId, versionSeq);

      if (locks.length === 0) {
        return { canEdit: true, reason: "Nenhum lock ativo" };
      }

      // Verificar se usuário já tem lock ativo
      const userLock = locks.find((lock) => lock.locker_username === username);
      if (userLock) {
        // Verificar se lock expirou
        if (new Date(userLock.expires_at) < new Date()) {
          await this.removeExpiredLock(manualId, versionSeq);
          return {
            canEdit: true,
            reason: "Lock expirado, removido automaticamente",
          };
        }

        return {
          canEdit: true,
          reason: "Usuário já tem lock ativo",
          locker: userLock.locker_username,
          expiresAt: userLock.expires_at,
          lockId: userLock.doc_key,
        };
      }

      // Verificar se há sessão de co-edição ativa
      const coEditingSession = locks.find((lock) => lock.is_co_editing);
      if (coEditingSession) {
        return {
          canEdit: true,
          reason: `Pode juntar-se à sessão de co-edição com ${coEditingSession.locker_username}`,
          locker: coEditingSession.locker_username,
          expiresAt: coEditingSession.expires_at,
          lockId: coEditingSession.doc_key,
        };
      }

      // Lock exclusivo ativo
      const exclusiveLock = locks[0];
      return {
        canEdit: false,
        reason: `Arquivo sendo editado por ${exclusiveLock.locker_username}`,
        locker: exclusiveLock.locker_username,
        expiresAt: exclusiveLock.expires_at,
        lockId: exclusiveLock.doc_key,
      };
    } catch (error) {
      console.error("Erro ao verificar lock:", error);
      return { canEdit: false, reason: "Erro ao verificar lock" };
    }
  }

  /**
   * Renova lock existente
   */
  static async renewLock(
    manualId: string,
    versionSeq: number,
    timeoutMinutes: number = 30
  ): Promise<boolean> {
    try {
      const newExpiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

      await dbPool.query(
        `
        UPDATE edit_locks 
        SET expires_at = $3, updated_at = NOW()
        WHERE manual_id = $1 AND version_seq = $2
      `,
        [manualId, versionSeq, newExpiresAt]
      );

      return true;
    } catch (error) {
      console.error("Erro ao renovar lock:", error);
      return false;
    }
  }

  /**
   * Remove lock de edição
   */
  static async removeLock(
    manualId: string,
    versionSeq: number,
    username: string
  ): Promise<boolean> {
    try {
      const result = await dbPool.query(
        `
        DELETE FROM edit_locks 
        WHERE manual_id = $1 AND version_seq = $2 AND locker_username = $3
      `,
        [manualId, versionSeq, username]
      );

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Erro ao remover lock:", error);
      return false;
    }
  }

  /**
   * Remove lock expirado
   */
  static async removeExpiredLock(
    manualId: string,
    versionSeq: number
  ): Promise<void> {
    try {
      await dbPool.query(
        `
        DELETE FROM edit_locks 
        WHERE manual_id = $1 AND version_seq = $2 AND expires_at < NOW()
      `,
        [manualId, versionSeq]
      );
    } catch (error) {
      console.error("Erro ao remover lock expirado:", error);
    }
  }

  /**
   * Obtém locks ativos para uma versão (suporte a co-edição)
   */
  private static async getActiveLocksForVersion(
    manualId: string,
    versionSeq: number
  ): Promise<EditLock[]> {
    try {
      const result = await dbPool.query(
        `
        SELECT manual_id, version_seq, locker_username, doc_key, expires_at, created_at, is_co_editing, co_editing_session_id
        FROM edit_locks 
        WHERE manual_id = $1 AND version_seq = $2 AND expires_at > NOW()
        ORDER BY created_at ASC
      `,
        [manualId, versionSeq]
      );

      return result.rows || [];
    } catch (error) {
      console.error("Erro ao buscar locks:", error);
      return [];
    }
  }

  /**
   * Obtém lock ativo (método legado)
   */
  private static async getActiveLock(
    manualId: string,
    versionSeq: number
  ): Promise<EditLock | null> {
    const locks = await this.getActiveLocksForVersion(manualId, versionSeq);
    return locks.length > 0 ? locks[0] : null;
  }

  /**
   * Lista todos os locks ativos
   */
  static async listActiveLocks(): Promise<EditLock[]> {
    try {
      const result = await dbPool.query(`
        SELECT manual_id, version_seq, locker_username, doc_key, expires_at, created_at
        FROM edit_locks 
        WHERE expires_at > NOW()
        ORDER BY created_at ASC
      `);

      return result.rows;
    } catch (error) {
      console.error("Erro ao listar locks:", error);
      return [];
    }
  }

  /**
   * Limpa locks expirados (cron job)
   */
  static async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await dbPool.query(`
        DELETE FROM edit_locks 
        WHERE expires_at < NOW()
      `);

      return result.rowCount || 0;
    } catch (error) {
      console.error("Erro ao limpar locks expirados:", error);
      return 0;
    }
  }

  /**
   * NOVO: Obtém usuários atualmente editando (co-edição)
   */
  static async getCoEditingUsers(
    manualId: string,
    versionSeq: number
  ): Promise<string[]> {
    try {
      const locks = await this.getActiveLocksForVersion(manualId, versionSeq);
      return locks
        .filter((lock) => lock.is_co_editing)
        .map((lock) => lock.locker_username);
    } catch (error) {
      console.error("Erro ao buscar usuários de co-edição:", error);
      return [];
    }
  }

  /**
   * NOVO: Finaliza sessão de co-edição (remove todos os locks)
   */
  static async endCoEditingSession(
    manualId: string,
    versionSeq: number,
    sessionId: string
  ): Promise<boolean> {
    try {
      const result = await dbPool.query(
        `
        DELETE FROM edit_locks 
        WHERE manual_id = $1 AND version_seq = $2 AND co_editing_session_id = $3
      `,
        [manualId, versionSeq, sessionId]
      );

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Erro ao finalizar sessão de co-edição:", error);
      return false;
    }
  }

  /**
   * NOVO: Verifica se há sessão de co-edição ativa
   */
  static async hasActiveCoEditingSession(
    manualId: string,
    versionSeq: number
  ): Promise<boolean> {
    try {
      const locks = await this.getActiveLocksForVersion(manualId, versionSeq);
      return locks.some((lock) => lock.is_co_editing);
    } catch (error) {
      console.error("Erro ao verificar sessão de co-edição:", error);
      return false;
    }
  }
}
