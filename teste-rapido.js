const fs = require("fs");
const path = require("path");

console.log("🧪 TESTE RÁPIDO - Verificando arquivo DOCX");
console.log("=".repeat(50));

// Verificar se o arquivo existe
const filePath = path.join(__dirname, "doc", "teste-manual.docx");
const fileExists = fs.existsSync(filePath);

if (fileExists) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);

  console.log("✅ Arquivo encontrado!");
  console.log(`📁 Caminho: ${filePath}`);
  console.log(`📏 Tamanho: ${fileSizeInBytes} bytes (${fileSizeInKB} KB)`);

  // Tentar ler o arquivo
  try {
    const fileBuffer = fs.readFileSync(filePath);
    console.log("✅ Arquivo pode ser lido!");
    console.log(
      `🔢 Primeiros bytes: ${fileBuffer.slice(0, 10).toString("hex")}`
    );
    console.log(`🔢 Últimos bytes: ${fileBuffer.slice(-10).toString("hex")}`);

    // Verificar se parece um arquivo DOCX (começa com PK)
    if (fileBuffer.slice(0, 2).toString() === "PK") {
      console.log("✅ Arquivo parece ser um DOCX válido (começa com PK)");
    } else {
      console.log("⚠️  Arquivo não parece ser um DOCX padrão");
    }
  } catch (error) {
    console.error("❌ Erro ao ler arquivo:", error.message);
  }
} else {
  console.error("❌ Arquivo não encontrado!");
  console.log(`🔍 Procurando em: ${filePath}`);

  // Listar arquivos na pasta doc
  const docDir = path.join(__dirname, "doc");
  if (fs.existsSync(docDir)) {
    const files = fs.readdirSync(docDir);
    console.log("📁 Arquivos na pasta doc/:");
    files.forEach((file) => {
      const fullPath = path.join(docDir, file);
      const stats = fs.statSync(fullPath);
      console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  } else {
    console.log("❌ Pasta doc/ não existe!");
  }
}

console.log("=".repeat(50));
console.log("🎯 Próximo passo: npm run insert-test-data");
