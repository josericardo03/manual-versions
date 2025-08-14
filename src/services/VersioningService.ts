import { ManualVersion, Manual, FileUploadRequest } from "../types";

export class VersioningService {
  /**
   * Determina se um upload deve criar uma nova versão ou editar a existente
   */
  static shouldCreateNewVersion(
    request: FileUploadRequest,
    currentManual: Manual,
    currentVersion?: ManualVersion
  ): boolean {
    // Se explicitamente solicitado nova versão
    if (request.isNewVersion) {
      return true;
    }

    // Se não há versão atual, sempre cria nova
    if (!currentVersion) {
      return true;
    }

    // Se o manual está em estado que permite edição
    if (this.canEditCurrentVersion(currentManual, currentVersion)) {
      return false; // Edita a versão atual
    }

    // Se não pode editar, força nova versão
    return true;
  }

  /**
   * Verifica se a versão atual pode ser editada
   */
  static canEditCurrentVersion(
    manual: Manual,
    version: ManualVersion
  ): boolean {
    // Não pode editar se estiver arquivado
    if (manual.state === "archived") {
      return false;
    }

    // Não pode editar versões publicadas
    if (
      manual.published_version_seq &&
      version.version_seq <= manual.published_version_seq
    ) {
      return false;
    }

    // Pode editar se estiver em draft ou in_review
    return ["draft", "in_review"].includes(manual.state);
  }

  /**
   * Obtém o próximo número de versão
   */
  static getNextVersionNumber(manual: Manual): number {
    return (manual.latest_version_seq || 0) + 1;
  }

  /**
   * Valida a transição de estado do manual
   */
  static validateStateTransition(
    currentState: string,
    newState: string,
    hasApprovals: boolean = false
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      draft: ["in_review", "archived"],
      in_review: ["approved", "draft", "archived"],
      approved: ["published", "draft", "archived"],
      published: ["draft", "archived"],
      archived: ["draft"],
    };

    const allowedStates = validTransitions[currentState] || [];
    return allowedStates.includes(newState);
  }

  /**
   * Verifica se uma versão pode ser publicada
   */
  static canPublishVersion(
    manual: Manual,
    version: ManualVersion,
    requiredApprovals: number,
    currentApprovals: number
  ): boolean {
    // Manual deve estar aprovado
    if (manual.state !== "approved") {
      return false;
    }

    // Versão deve ser a aprovada
    if (
      manual.published_version_seq &&
      version.version_seq <= manual.published_version_seq
    ) {
      return false;
    }

    // Deve ter aprovações suficientes
    return currentApprovals >= requiredApprovals;
  }

  /**
   * Gera o changelog para uma nova versão
   */
  static generateChangelog(
    request: FileUploadRequest,
    previousVersion?: ManualVersion
  ): string {
    if (request.changelog) {
      return request.changelog;
    }

    if (!previousVersion) {
      return "Versão inicial";
    }

    return `Atualização da versão ${previousVersion.version_seq}`;
  }

  /**
   * Verifica se há conflitos de versão
   */
  static hasVersionConflict(
    manualId: string,
    versionSeq: number,
    format: string,
    existingVersions: ManualVersion[]
  ): boolean {
    return existingVersions.some(
      (version) =>
        version.manual_id === manualId &&
        version.version_seq === versionSeq &&
        version.format === format
    );
  }

  /**
   * Obtém o estado recomendado para uma nova versão
   */
  static getRecommendedStateForNewVersion(manual: Manual): string {
    // Se o manual estava publicado, nova versão volta para draft
    if (manual.state === "published") {
      return "draft";
    }

    // Se estava em review, volta para draft
    if (manual.state === "in_review") {
      return "draft";
    }

    // Mantém o estado atual
    return manual.state;
  }
}
