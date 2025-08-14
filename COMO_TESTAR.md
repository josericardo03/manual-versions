# 🧪 **COMO TESTAR O SISTEMA DE VERSIONAMENTO**

## 📋 **PRÉ-REQUISITOS**

1. ✅ **Banco PostgreSQL configurado** (você já fez!)
2. ✅ **Arquivo .env configurado** com as credenciais do banco
3. ✅ **Arquivo DOCX de teste** (você vai criar)

## 🚀 **PASSO A PASSO PARA TESTAR**

### **1. Arquivo DOCX de teste**

- ✅ **Arquivo já criado:** `doc/teste-manual.docx`
- **Tamanho:** 314KB
- **Localização:** Pasta `doc/` do projeto

### **2. Inserir dados de teste no banco**

```bash
npm run insert-test-data
```

**Resultado esperado:**

```
🔄 Inserindo dados de teste...
✅ Dados de teste inseridos com sucesso!
📋 Manual ID: 123e4567-e89b-12d3-a456-426614174000
👤 Usuário: usuario.teste
🔑 Senha: (qualquer uma, não usamos autenticação ainda)
```

### **3. Iniciar o servidor**

```bash
npm run dev
```

**Resultado esperado:**

```
🚀 Servidor rodando na porta 3000
✅ Conexão com banco estabelecida
```

### **4. Testar no Insomnia**

#### **4.1 Importar configuração**

- Abra o Insomnia
- Clique em **Import/Export** → **Import Data**
- Selecione o arquivo `insomnia-manuais-versionamento.json`

#### **4.2 Health Check**

- Execute: `GET /api/files/health`
- **Resultado esperado:** Status 200 com mensagem "API funcionando"

#### **4.3 Upload do arquivo DOCX**

- Execute: `POST /api/files/new-version`
- **Configuração:**
  - **file:** Selecione `doc/teste-manual.docx`
  - **manualId:** `123e4567-e89b-12d3-a456-426614174000`
  - **format:** `docx`
  - **changelog:** `Primeira versão do manual de teste`
  - **username:** `usuario.teste`

**Resultado esperado:**

```json
{
  "success": true,
  "message": "Nova versão 1 criada com sucesso",
  "action": "new_version_forced",
  "versionNumber": 1
}
```

#### **4.4 Listar versões**

- Execute: `GET /api/files/123e4567-e89b-12d3-a456-426614174000/versions`
- **Resultado esperado:** Lista com a versão 1 criada

#### **4.5 Download do arquivo**

- Execute: `GET /api/files/123e4567-e89b-12d3-a456-426614174000/versions/1/docx/download`
- **Resultado esperado:** Arquivo DOCX baixado

#### **4.6 Testar co-edição**

- Execute: `POST /api/files/123e4567-e89b-12d3-a456-426614174000/versions/1/docx/lock`
- **Body:**

```json
{
  "username": "usuario.teste",
  "timeoutMinutes": 30,
  "enableCoEditing": true
}
```

## 🔍 **VERIFICAR NO BANCO**

### **Verificar se o arquivo foi salvo:**

```sql
SELECT
  manual_id,
  version_seq,
  format,
  size_bytes,
  checksum_sha256,
  LENGTH(file_data) as file_size_bytes
FROM manual_versions
WHERE manual_id = '123e4567-e89b-12d3-a456-426614174000';
```

**Resultado esperado:**

- `version_seq`: 1
- `format`: docx
- `size_bytes`: > 0
- `file_size_bytes`: > 0 (dados binários salvos)

## 🎯 **TESTES ADICIONAIS**

### **1. Testar edição (não nova versão)**

```bash
POST /api/files/edit
Body: Form Data
- file: arquivo_modificado.docx
- manualId: 123e4567-e89b-12d3-a456-426614174000
- versionSeq: 1
- format: docx
- changelog: Correções na versão 1
- username: usuario.teste
```

### **2. Testar nova versão forçada**

```bash
POST /api/files/new-version
Body: Form Data
- file: nova_versao.docx
- manualId: 123e4567-e89b-12d3-a456-426614174000
- format: docx
- changelog: Segunda versão
- username: usuario.teste
```

## ❌ **PROBLEMAS COMUNS**

### **1. Erro de conexão com banco**

- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env`

### **2. Erro "Manual não encontrado"**

- Execute `npm run insert-test-data` primeiro
- Verifique se o `manualId` está correto

### **3. Erro "Nenhum arquivo foi enviado"**

- Certifique-se de selecionar o arquivo no campo `file`
- Use `multipart/form-data` no Insomnia

### **4. Erro de permissão**

- Verifique se o usuário `usuario.teste` existe
- Confirme se o ACL foi criado corretamente

## 🎉 **SUCESSO!**

Se tudo funcionou:

- ✅ Arquivo DOCX foi salvo no banco
- ✅ Pode ser baixado via API
- ✅ Sistema de versionamento funcionando
- ✅ Co-edição configurada
- ✅ Seu outro backend pode usar esta API!

## 📞 **PRÓXIMOS PASSOS**

1. **Integrar com OnlyOffice** (seu outro backend)
2. **Implementar autenticação real**
3. **Adicionar validações de segurança**
4. **Implementar auditoria completa**
