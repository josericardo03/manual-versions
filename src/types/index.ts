export interface User {
  username: string;
  full_name: string;
  email?: string;
  is_active: boolean;
  last_login_at?: Date;
}

export interface Group {
  name: string;
  description?: string;
}

export interface Manual {
  id: string;
  title: string;
  slug: string;
  owner_username: string;
  state: "draft" | "in_review" | "approved" | "published" | "archived";
  created_at: Date;
  updated_at: Date;
  latest_version_seq?: number;
  published_version_seq?: number;
}

export interface ManualVersion {
  manual_id: string;
  version_seq: number;
  format: "docx" | "pdf";
  object_key: string;
  s3_version_id?: string;
  checksum_sha256: string;
  size_bytes: number;
  created_by: string;
  created_at: Date;
  changelog?: string;
  file_data?: Buffer; // NOVO: dados binários do arquivo
}

export interface ManualACL {
  id: string;
  manual_id: string;
  principal_type: "user" | "group";
  principal_id: string;
  role: "read" | "edit" | "approve" | "admin";
}

export interface ManualApprovalRule {
  manual_id: string;
  required_approvals: number;
}

export interface ManualApproval {
  manual_id: string;
  version_seq: number;
  approver_username: string;
  decision: "approved" | "rejected";
  comment?: string;
  decided_at: Date;
}

export interface EditLock {
  manual_id: string;
  version_seq: number;
  locker_username: string;
  doc_key: string;
  expires_at: Date;
}

export interface AuditLog {
  id: number;
  at: Date;
  actor_username?: string;
  action: string;
  manual_id?: string;
  version_seq?: number;
  details?: any;
}

export interface FileUploadRequest {
  manualId: string;
  versionSeq?: number;
  format: "docx" | "pdf";
  changelog?: string;
  isNewVersion: boolean;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  version?: ManualVersion;
  objectKey?: string;
  checksum?: string;
}
