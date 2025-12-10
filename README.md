# SRM FAQ - Sistema de FAQ Inteligente

Sistema de FAQ com busca semântica vetorizada e respostas humanizadas por IA.

## Arquitetura

- **PostgreSQL + pgvector** - Armazenamento vetorial
- **Ollama** - Embeddings ()
- **Groq** - Humanização de respostas (llama-3.3-70b)
- **NestJS** - API REST

## Deploy no Dokploy

1. Suba o código para o GitHub
2. No Dokploy, crie um Compose com o conteúdo de `docker/docker-compose.yml`
3. Execute o SQL de `docker/init.sql` no banco
4. Acesse `/admin` para cadastrar respostas

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/knowledge` | Listar respostas |
| POST | `/api/knowledge` | Criar resposta |
| PUT | `/api/knowledge/:id` | Atualizar |
| DELETE | `/api/knowledge/:id` | Excluir |
| POST | `/api/knowledge/chat` | Chat com IA |

## Exemplo de uso

```bash
# Cadastrar resposta
curl -X POST http://localhost:3028/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{"title": "Formas de pagamento", "content": "Aceitamos cartão, boleto e PIX.", "category": "Pagamento"}'

# Chat
curl -X POST http://localhost:3028/api/knowledge/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Vocês aceitam boleto?"}'
```
