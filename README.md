# SRM FAQ - Sistema de FAQ Vetorizado com IA

Sistema completo de FAQ com busca semântica vetorizada e respostas humanizadas por IA local.

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Admin Panel   │────▶│   NestJS API    │────▶│   PostgreSQL    │
│     (HTML)      │     │                 │     │   + pgvector    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │     Ollama      │
                        │  (Embeddings +  │
                        │     Chat)       │
                        └─────────────────┘
```

## 🚀 Deploy com Dokploy

### 1. Preparar o servidor

```bash
# Clonar/enviar arquivos para o servidor
cd /opt
git clone <seu-repositorio> srm-faq
# ou
scp -r ./srm-faq user@seu-servidor:/opt/
```

### 2. Configurar variáveis de ambiente

```bash
cd /opt/srm-faq
cp .env.example .env
nano .env  # Editar com suas configurações
```

### 3. Subir os containers

```bash
cd /opt/srm-faq/docker
docker-compose up -d
```

### 4. Baixar os modelos de IA (primeira vez)

```bash
# Aguardar o Ollama iniciar (~30s)
docker exec -it srm-ollama ollama pull nomic-embed-text
docker exec -it srm-ollama ollama pull llama3.2:3b
```

### 5. Verificar se está funcionando

```bash
# Health check
curl http://localhost:3000/health

# Testar Ollama
curl http://localhost:11434/api/tags
```

## 📁 Estrutura do Projeto

```
srm-faq/
├── docker/
│   ├── docker-compose.yml   # Orquestração dos containers
│   ├── Dockerfile           # Build do NestJS
│   └── init.sql             # Script de inicialização do banco
├── src/
│   ├── main.ts              # Entrada da aplicação
│   ├── app.module.ts        # Módulo principal
│   ├── health.controller.ts # Health check
│   ├── config/              # Configurações
│   └── faq/                 # Módulo de FAQ
│       ├── faq.controller.ts
│       ├── faq.service.ts
│       ├── database.service.ts
│       ├── ollama.service.ts
│       └── faq.dto.ts
├── public/
│   ├── index.html           # Redirect para admin
│   └── admin/
│       └── index.html       # Painel administrativo
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔌 API Endpoints

### FAQs (CRUD)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/faq` | Listar todas FAQs |
| GET | `/api/faq/:id` | Buscar FAQ por ID |
| POST | `/api/faq` | Criar nova FAQ |
| PUT | `/api/faq/:id` | Atualizar FAQ |
| DELETE | `/api/faq/:id` | Excluir FAQ |

### Busca e Chat

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/faq/search` | Busca semântica |
| POST | `/api/faq/chat` | Chat com IA |

### Utilitários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/faq/stats` | Estatísticas |
| GET | `/api/faq/categories` | Listar categorias |
| GET | `/health` | Health check |

## 📝 Exemplos de Uso

### Criar FAQ

```bash
curl -X POST http://localhost:3000/api/faq \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Como redefinir minha senha?",
    "answer": "Acesse a tela de login e clique em Esqueci minha senha...",
    "category": "Conta",
    "tags": ["senha", "login"]
  }'
```

### Busca Semântica

```bash
curl -X POST http://localhost:3000/api/faq/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "esqueci minha senha",
    "threshold": 0.5,
    "limit": 5
  }'
```

### Chat com IA

```bash
curl -X POST http://localhost:3000/api/faq/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Como faço para trocar minha senha?",
    "sessionId": "opcional-para-contexto"
  }'
```

## 🎯 Integração com seu Sistema SRM

### Widget de Chat (Frontend)

```html
<script>
const SRM_FAQ_API = 'https://faq.seudominio.com/api/faq';

async function askFAQ(question) {
  const response = await fetch(`${SRM_FAQ_API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: question,
      sessionId: localStorage.getItem('faqSessionId')
    })
  });
  
  const result = await response.json();
  localStorage.setItem('faqSessionId', result.data.sessionId);
  return result.data.answer;
}
</script>
```

### Backend (NestJS/Node)

```typescript
import { HttpService } from '@nestjs/axios';

@Injectable()
export class FaqIntegrationService {
  constructor(private http: HttpService) {}

  async chat(message: string, sessionId?: string) {
    const { data } = await this.http.post('http://srm-faq-api:3000/api/faq/chat', {
      message,
      sessionId
    }).toPromise();
    
    return data;
  }
}
```

## 🔧 Configuração de Produção

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name faq.seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Requisitos de Hardware

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disco | 20 GB | 50+ GB |
| GPU | - | NVIDIA (opcional) |

### Modelos de IA por Capacidade

| RAM Disponível | Modelo Recomendado |
|----------------|-------------------|
| 4 GB | llama3.2:1b |
| 6-8 GB | llama3.2:3b |
| 8-16 GB | llama3.1:8b |
| 16+ GB | llama3.1:70b |

## 🐛 Troubleshooting

### Ollama não inicia
```bash
docker logs srm-ollama
# Se GPU NVIDIA, verificar drivers:
nvidia-smi
```

### Embeddings lentos
```bash
# Verificar se modelo está carregado
docker exec srm-ollama ollama list
```

### Banco não conecta
```bash
docker logs srm-postgres
docker exec -it srm-postgres psql -U srm_user -d srm_faq -c "SELECT 1"
```

## 📄 Licença

MIT
