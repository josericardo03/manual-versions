# Sistema de Versionamento de Manuais

Sistema em Node.js + TypeScript focado em receber arquivos e controlar edição vs. versionamento, baseado na estrutura de banco de dados fornecida.

## 🎯 **Funcionalidades**

### **Controle de Arquivos**

- ✅ Upload de arquivos (DOCX, PDF)
- ✅ Cálculo automático de checksum SHA256
- ✅ Validação de formato e tamanho
- ✅ Geração de chaves únicas para storage

### **Sistema de Versionamento**

- 🆕 **Nova Versão**: Cria automaticamente versão incrementada
- ✏️ **Edição**: Atualiza versão existente quando permitido
- 🔒 **Controle de Estado**: Impede edição de versões publicadas
- 📝 **Changelog**: Registra mudanças entre versões

### **Lógica Inteligente**

- 🤖 **Auto-detecção**: Determina se deve criar nova versão ou editar
- 🚫 **Validações**: Verifica permissões e estados antes de permitir edição
- 📊 **Metadados**: Mantém histórico completo de versões

## 🏗️ **Arquitetura**

```
src/
├── types/           # Interfaces TypeScript
├── services/        # Lógica de negócio
│   ├── FileService.ts      # Controle de arquivos
│   └── VersioningService.ts # Lógica de versionamento
├── controllers/     # Controllers HTTP
├── routes/          # Rotas da API
└── index.ts         # Aplicação principal
```

## 🚀 **Instalação**

### 1. **Instalar Dependências**

```bash
npm install
```

### 2. **Compilar TypeScript**

```bash
npm run build
```

### 3. **Executar**

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📡 **API Endpoints**

### **Upload Inteligente**

```http
POST /api/files/upload
Content-Type: multipart/form-data

file: [arquivo]
manualId: "uuid-do-manual"
format: "docx" | "pdf"
changelog: "Descrição das mudanças" (opcional)
isNewVersion: "true" | "false" (opcional)
```

### **Forçar Nova Versão**

```http
POST /api/files/new-version
Content-Type: multipart/form-data

file: [arquivo]
manualId: "uuid-do-manual"
format: "docx" | "pdf"
changelog: "Descrição das mudanças" (opcional)
```

### **Forçar Edição**

```http
POST /api/files/edit
Content-Type: multipart/form-data

file: [arquivo]
manualId: "uuid-do-manual"
versionSeq: "1"
format: "docx" | "pdf"
changelog: "Descrição das mudanças" (opcional)
```

### **Verificar Permissão de Edição**

```http
GET /api/files/:manualId/:versionSeq/can-edit
```

### **Health Check**

```http
GET /api/files/health
```

## 🔄 **Como Funciona**

### **1. Upload Inteligente**

O sistema analisa automaticamente:

- Estado atual do manual
- Versão mais recente
- Se a versão pode ser editada
- Se deve criar nova versão ou editar existente

### **2. Regras de Versionamento**

- **Draft/In Review**: Pode editar versão atual
- **Approved/Published**: Força criação de nova versão
- **Archived**: Não permite edição

### **3. Estrutura de Pastas**

```
manuals/
├── {manualId}/
│   ├── versions/
│   │   ├── 1/
│   │   │   └── document.docx
│   │   ├── 2/
│   │   │   └── document.docx
│   │   └── 3/
│   │       └── document.pdf
```

## 📊 **Exemplos de Uso**

### **Cenário 1: Primeiro Upload**

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@documento.docx" \
  -F "manualId=123e4567-e89b-12d3-a456-426614174000" \
  -F "format=docx"
```

**Resultado**: Cria versão 1 automaticamente

### **Cenário 2: Edição de Draft**

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@documento_editado.docx" \
  -F "manualId=123e4567-e89b-12d3-a456-426614174000" \
  -F "format=docx" \
  -F "isNewVersion=false"
```

**Resultado**: Atualiza versão 1 existente

### **Cenário 3: Nova Versão Após Aprovação**

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@documento_novo.docx" \
  -F "manualId=123e4567-e89b-12d3-a456-426614174000" \
  -F "format=docx" \
  -F "changelog=Correções de revisão"
```

**Resultado**: Cria versão 2 automaticamente

## 🔧 **Configuração**

### **Variáveis de Ambiente**

```env
PORT=3000
NODE_ENV=development
```

### **Limites**

- **Tamanho máximo**: 50MB por arquivo
- **Formatos suportados**: DOCX, PDF
- **Timeout**: Configurável via variáveis de ambiente

## 🧪 **Testes**

### **Testar Health Check**

```bash
curl http://localhost:3000/api/files/health
```

### **Testar Upload**

```bash
# Criar arquivo de teste
echo "Teste" > teste.docx

# Fazer upload
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@teste.docx" \
  -F "manualId=test-123" \
  -F "format=docx"
```

## 📝 **Logs**

O sistema registra todas as operações:

```
2024-01-15T10:30:00.000Z - POST /api/files/upload
2024-01-15T10:30:01.000Z - Arquivo processado: manual-123, versão 1
2024-01-15T10:30:02.000Z - Checksum calculado: a1b2c3d4...
```

## 🔒 **Segurança**

- ✅ **Helmet**: Headers de segurança
- ✅ **CORS**: Controle de origem
- ✅ **Validação**: Tipos de arquivo e tamanho
- ✅ **Sanitização**: Nomes de arquivo seguros

## 🚧 **Próximos Passos**

- [ ] Integração com banco de dados PostgreSQL
- [ ] Sistema de autenticação e autorização
- [ ] Upload para S3/MinIO
- [ ] API de busca e listagem de versões
- [ ] Sistema de notificações
- [ ] Interface web

## 📞 **Suporte**

Para dúvidas ou problemas, consulte a documentação ou abra uma issue no repositório.
