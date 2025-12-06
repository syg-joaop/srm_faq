-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de FAQs vetorizadas
CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    embedding vector(768), -- nomic-embed-text usa 768 dimensões
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca vetorial otimizada (HNSW é mais rápido que IVFFlat)
CREATE INDEX IF NOT EXISTS faqs_embedding_idx ON faqs 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice para categoria
CREATE INDEX IF NOT EXISTS faqs_category_idx ON faqs (category);

-- Índice para busca por tags
CREATE INDEX IF NOT EXISTS faqs_tags_idx ON faqs USING GIN (tags);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_faqs_updated_at ON faqs;
CREATE TRIGGER update_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para busca semântica
CREATE OR REPLACE FUNCTION search_similar_faqs(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id INT,
    question TEXT,
    answer TEXT,
    category VARCHAR(100),
    tags TEXT[],
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.question,
        f.answer,
        f.category,
        f.tags,
        1 - (f.embedding <=> query_embedding) as similarity
    FROM faqs f
    WHERE f.is_active = true
        AND 1 - (f.embedding <=> query_embedding) > match_threshold
    ORDER BY f.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Tabela de logs de conversas (para analytics futuros)
CREATE TABLE IF NOT EXISTS conversation_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    user_question TEXT NOT NULL,
    matched_faq_id INT REFERENCES faqs(id),
    ai_response TEXT,
    similarity_score FLOAT,
    helpful BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para analytics
CREATE INDEX IF NOT EXISTS conversation_logs_session_idx ON conversation_logs (session_id);
CREATE INDEX IF NOT EXISTS conversation_logs_created_idx ON conversation_logs (created_at);

-- Inserir algumas FAQs de exemplo
INSERT INTO faqs (question, answer, category, tags) VALUES
    ('Como faço para redefinir minha senha?', 
     'Para redefinir sua senha, acesse a tela de login e clique em "Esqueci minha senha". Você receberá um e-mail com um link para criar uma nova senha. O link expira em 24 horas.',
     'Conta',
     ARRAY['senha', 'login', 'acesso']),
    
    ('Quais são as formas de pagamento aceitas?',
     'Aceitamos cartões de crédito (Visa, Mastercard, Elo), boleto bancário e PIX. Para pagamentos recorrentes, apenas cartão de crédito está disponível.',
     'Pagamento',
     ARRAY['pagamento', 'cartão', 'boleto', 'pix']),
    
    ('Como entro em contato com o suporte?',
     'Você pode entrar em contato com nosso suporte através do chat no canto inferior direito, pelo e-mail suporte@srm.com.br ou pelo telefone (11) 1234-5678, de segunda a sexta das 8h às 18h.',
     'Suporte',
     ARRAY['suporte', 'contato', 'ajuda'])
ON CONFLICT DO NOTHING;
