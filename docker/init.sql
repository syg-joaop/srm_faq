-- SRM FAQ - Base de Conhecimento
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de conhecimento (apenas respostas)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    embedding vector(768),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice vetorial
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx ON knowledge_base 
USING hnsw (embedding vector_cosine_ops);

-- Função de busca
CREATE OR REPLACE FUNCTION search_knowledge(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.35,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id INT,
    title VARCHAR(200),
    content TEXT,
    category VARCHAR(100),
    tags TEXT[],
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        k.id,
        k.title,
        k.content,
        k.category,
        k.tags,
        1 - (k.embedding <=> query_embedding) as similarity
    FROM knowledge_base k
    WHERE k.is_active = true
        AND 1 - (k.embedding <=> query_embedding) > match_threshold
    ORDER BY k.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Logs de conversas
CREATE TABLE IF NOT EXISTS chat_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    user_message TEXT NOT NULL,
    matched_knowledge_id INT REFERENCES knowledge_base(id) ON DELETE SET NULL,
    bot_response TEXT,
    similarity_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
