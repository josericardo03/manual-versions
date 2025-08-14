import { dbPool } from "../config/database";
import { ManualVersion } from "../types";

export class ManualVersionRepository {
  /**
   * Cria nova versão
   */
  static async create(version: ManualVersion): Promise<void> {
    try {
      const query = `
        INSERT INTO manual_versions (
          manual_id, version_seq, format, object_key, s3_version_id,
          checksum_sha256, size_bytes, created_by, created_at, changelog, file_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      await dbPool.query(query, [
        version.manual_id,
        version.version_seq,
        version.format,
        version.object_key,
        version.s3_version_id,
        version.checksum_sha256,
        version.size_bytes,
        version.created_by,
        version.created_at,
        version.changelog,
        version.file_data, // NOVO: dados binários do arquivo
      ]);
    } catch (error) {
      console.error("Erro ao criar versão:", error);
      throw error;
    }
  }

  /**
   * Atualiza versão existente
   */
  static async update(version: ManualVersion): Promise<void> {
    try {
      const query = `
        UPDATE manual_versions SET
          object_key = $4,
          s3_version_id = $5,
          checksum_sha256 = $6,
          size_bytes = $7,
          changelog = $10,
          file_data = $11
        WHERE manual_id = $1 AND version_seq = $2 AND format = $3
      `;

      await dbPool.query(query, [
        version.manual_id,
        version.version_seq,
        version.format,
        version.object_key,
        version.s3_version_id,
        version.checksum_sha256,
        version.size_bytes,
        version.changelog,
        version.file_data, // NOVO: dados binários do arquivo
      ]);
    } catch (error) {
      console.error("Erro ao atualizar versão:", error);
      throw error;
    }
  }

  /**
   * Busca versão específica
   */
  static async findByVersion(
    manualId: string,
    versionSeq: number,
    format: string
  ): Promise<ManualVersion | null> {
    try {
      const query = `
        SELECT 
          manual_id, version_seq, format, object_key, s3_version_id,
          checksum_sha256, size_bytes, created_by, created_at, changelog, file_data
        FROM manual_versions 
        WHERE manual_id = $1 AND version_seq = $2 AND format = $3
      `;

      const result = await dbPool.query(query, [manualId, versionSeq, format]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro ao buscar versão:", error);
      throw error;
    }
  }

  /**
   * Verifica se versão existe
   */
  static async versionExists(
    manualId: string,
    versionSeq: number,
    format: string
  ): Promise<boolean> {
    try {
      const query = `
        SELECT 1 FROM manual_versions 
        WHERE manual_id = $1 AND version_seq = $2 AND format = $3
      `;

      const result = await dbPool.query(query, [manualId, versionSeq, format]);
      return result.rows.length > 0;
    } catch (error) {
      console.error("Erro ao verificar versão:", error);
      return false;
    }
  }

  /**
   * Busca versão publicada
   */
  static async getPublishedVersion(
    manualId: string
  ): Promise<ManualVersion | null> {
    try {
      const query = `
        SELECT mv.* FROM manual_versions mv
        JOIN manuals m ON mv.manual_id = m.id
        WHERE m.id = $1 AND mv.version_seq = m.published_version_seq
      `;

      const result = await dbPool.query(query, [manualId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro ao buscar versão publicada:", error);
      throw error;
    }
  }
}
