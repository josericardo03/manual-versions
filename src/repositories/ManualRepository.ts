import { dbPool } from "../config/database";
import { Manual, ManualVersion } from "../types";

export class ManualRepository {
  /**
   * Busca manual por ID
   */
  static async findById(id: string): Promise<Manual | null> {
    try {
      const query = `
        SELECT 
          id, title, slug, owner_username, state, 
          created_at, updated_at, latest_version_seq, published_version_seq
        FROM manuals 
        WHERE id = $1
      `;

      const result = await dbPool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro ao buscar manual:", error);
      throw error;
    }
  }

  /**
   * Busca versão mais recente de um manual
   */
  static async getLatestVersion(
    manualId: string
  ): Promise<ManualVersion | null> {
    try {
      const query = `
        SELECT 
          manual_id, version_seq, format, object_key, s3_version_id,
          checksum_sha256, size_bytes, created_by, created_at, changelog
        FROM manual_versions 
        WHERE manual_id = $1 
        ORDER BY version_seq DESC 
        LIMIT 1
      `;

      const result = await dbPool.query(query, [manualId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro ao buscar versão mais recente:", error);
      throw error;
    }
  }

  /**
   * Busca todas as versões de um manual
   */
  static async getVersions(manualId: string): Promise<ManualVersion[]> {
    try {
      const query = `
        SELECT 
          manual_id, version_seq, format, object_key, s3_version_id,
          checksum_sha256, size_bytes, created_by, created_at, changelog
        FROM manual_versions 
        WHERE manual_id = $1 
        ORDER BY version_seq DESC
      `;

      const result = await dbPool.query(query, [manualId]);
      return result.rows;
    } catch (error) {
      console.error("Erro ao buscar versões:", error);
      throw error;
    }
  }

  /**
   * Atualiza latest_version_seq do manual
   */
  static async updateLatestVersion(
    manualId: string,
    versionSeq: number
  ): Promise<void> {
    try {
      const query = `
        UPDATE manuals 
        SET latest_version_seq = $2, updated_at = now() 
        WHERE id = $1
      `;

      await dbPool.query(query, [manualId, versionSeq]);
    } catch (error) {
      console.error("Erro ao atualizar versão mais recente:", error);
      throw error;
    }
  }

  /**
   * Verifica se usuário tem permissão para editar
   */
  static async canUserEdit(
    manualId: string,
    username: string
  ): Promise<boolean> {
    try {
      // Verificar se é owner
      const manualQuery = `
        SELECT owner_username FROM manuals WHERE id = $1
      `;
      const manualResult = await dbPool.query(manualQuery, [manualId]);

      if (manualResult.rows[0]?.owner_username === username) {
        return true; // Owner sempre pode editar
      }

      // Verificar ACLs
      const aclQuery = `
        SELECT role FROM manual_acls 
        WHERE manual_id = $1 AND principal_type = 'user' AND principal_id = $2
      `;
      const aclResult = await dbPool.query(aclQuery, [manualId, username]);

      return aclResult.rows.some((row) =>
        ["edit", "approve", "admin"].includes(row.role)
      );
    } catch (error) {
      console.error("Erro ao verificar permissão:", error);
      return false;
    }
  }
}
