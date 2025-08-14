import { dbPool } from "../config/database";
import { v4 as uuidv4 } from "uuid";

async function insertTestData() {
  try {
    console.log("🔄 Inserindo dados de teste...");

    // 1. Inserir usuário de teste
    await dbPool.query(
      `
      INSERT INTO users (username, full_name, email, is_active) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `,
      ["usuario.teste", "Usuário de Teste", "teste@exemplo.com", true]
    );

    // 2. Inserir grupo de teste
    await dbPool.query(
      `
      INSERT INTO groups (name, description) 
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING
    `,
      ["editores", "Grupo de editores de manuais"]
    );

    // 3. Relacionar usuário ao grupo
    await dbPool.query(
      `
      INSERT INTO user_groups (username, group_name) 
      VALUES ($1, $2)
      ON CONFLICT (username, group_name) DO NOTHING
    `,
      ["usuario.teste", "editores"]
    );

    // 4. Inserir manual de teste
    const manualId = "123e4567-e89b-12d3-a456-426614174000";
    await dbPool.query(
      `
      INSERT INTO manuals (id, title, slug, owner_username, state, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        manualId,
        "Manual de Teste",
        "manual-teste",
        "usuario.teste",
        "draft",
        new Date(),
        new Date(),
      ]
    );

    // 5. Inserir ACL para o usuário poder editar (CORRIGIDO: usando UUID válido)
    const aclId = uuidv4(); // Gerar UUID válido
    await dbPool.query(
      `
      INSERT INTO manual_acls (id, manual_id, principal_type, principal_id, role) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (manual_id, principal_type, principal_id, role) DO NOTHING
    `,
      [aclId, manualId, "user", "usuario.teste", "edit"]
    );

    console.log("✅ Dados de teste inseridos com sucesso!");
    console.log(`📋 Manual ID: ${manualId}`);
    console.log(`🔐 ACL ID: ${aclId}`);
    console.log("👤 Usuário: usuario.teste");
    console.log("🔑 Senha: (qualquer uma, não usamos autenticação ainda)");
    console.log("📁 Arquivo de teste: doc/teste-manual.docx");
  } catch (error) {
    console.error("❌ Erro ao inserir dados de teste:", error);
  } finally {
    await dbPool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  insertTestData();
}
