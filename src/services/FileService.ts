import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { ManualVersion, FileUploadRequest, FileUploadResponse } from "../types";

export class FileService {
  /**
   * Calcula o checksum SHA256 de um arquivo
   */
  static calculateChecksum(fileBuffer: Buffer): string {
    return createHash("sha256").update(fileBuffer).digest("hex");
  }

  /**
   * Gera uma chave única para o arquivo no storage
   */
  static generateObjectKey(
    manualId: string,
    versionSeq: number,
    format: string
  ): string {
    return `manuals/${manualId}/versions/${versionSeq}/document.${format}`;
  }

  /**
   * Valida o formato do arquivo
   */
  static validateFileFormat(format: string): boolean {
    return ["docx", "pdf"].includes(format.toLowerCase());
  }

  /**
   * Obtém o próximo número de versão para um manual
   */
  static getNextVersionNumber(currentLatestVersion: number): number {
    return currentLatestVersion + 1;
  }

  /**
   * Processa o upload de um arquivo e determina se é edição ou nova versão
   */
  static async processFileUpload(
    fileBuffer: Buffer,
    fileName: string,
    request: FileUploadRequest,
    username: string,
    currentLatestVersion: number = 0
  ): Promise<FileUploadResponse> {
    try {
      // Validar formato do arquivo
      if (!this.validateFileFormat(request.format)) {
        return {
          success: false,
          message: `Formato de arquivo não suportado: ${request.format}. Apenas docx e pdf são permitidos.`,
        };
      }

      // Calcular checksum e tamanho
      const checksum = this.calculateChecksum(fileBuffer);
      const sizeBytes = fileBuffer.length;

      // Determinar número da versão
      let versionSeq: number;
      if (request.isNewVersion) {
        // Nova versão - incrementa o número
        versionSeq = this.getNextVersionNumber(currentLatestVersion);
      } else {
        // Edição da versão atual
        versionSeq = request.versionSeq || currentLatestVersion;
      }

      // Gerar chave do objeto no storage
      const objectKey = this.generateObjectKey(
        request.manualId,
        versionSeq,
        request.format
      );

      // Criar metadados da versão
      const version: ManualVersion = {
        manual_id: request.manualId,
        version_seq: versionSeq,
        format: request.format,
        object_key: objectKey,
        checksum_sha256: checksum,
        size_bytes: sizeBytes,
        created_by: username,
        created_at: new Date(),
        changelog: request.changelog,
        file_data: fileBuffer, // NOVO: dados binários do arquivo
      };

      return {
        success: true,
        message: request.isNewVersion
          ? `Nova versão ${versionSeq} criada com sucesso`
          : `Versão ${versionSeq} atualizada com sucesso`,
        version: version,
        objectKey: objectKey,
        checksum: checksum,
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao processar arquivo: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      };
    }
  }

  /**
   * Verifica se um arquivo pode ser editado (não está publicado ou arquivado)
   */
  static canEditVersion(
    manualState: string,
    versionSeq: number,
    publishedVersionSeq?: number
  ): boolean {
    // Não pode editar se o manual estiver arquivado
    if (manualState === "archived") {
      return false;
    }

    // Não pode editar versões publicadas
    if (publishedVersionSeq && versionSeq <= publishedVersionSeq) {
      return false;
    }

    return true;
  }

  /**
   * Gera um nome de arquivo único para evitar conflitos
   */
  static generateUniqueFileName(
    originalName: string,
    manualId: string,
    versionSeq: number
  ): string {
    const extension = originalName.split(".").pop();
    const timestamp = Date.now();
    return `${manualId}_v${versionSeq}_${timestamp}.${extension}`;
  }

  /**
   * Valida o tamanho do arquivo
   */
  static validateFileSize(sizeBytes: number, maxSizeMB: number = 50): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return sizeBytes <= maxSizeBytes;
  }
}
