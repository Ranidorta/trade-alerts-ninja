-- Criar tabela para cache de jogos esportivos
CREATE TABLE public.sports_games_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league TEXT NOT NULL,
  season INTEGER NOT NULL,
  cache_key TEXT NOT NULL UNIQUE,
  games_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Criar tabela para cache de análises de odds
CREATE TABLE public.sports_odds_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league TEXT NOT NULL,
  page INTEGER NOT NULL DEFAULT 1,
  cache_key TEXT NOT NULL UNIQUE,
  odds_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Criar índices para melhor performance
CREATE INDEX idx_sports_games_cache_league_season ON public.sports_games_cache(league, season);
CREATE INDEX idx_sports_games_cache_expires_at ON public.sports_games_cache(expires_at);
CREATE INDEX idx_sports_odds_cache_league_page ON public.sports_odds_cache(league, page);
CREATE INDEX idx_sports_odds_cache_expires_at ON public.sports_odds_cache(expires_at);

-- Habilitar RLS
ALTER TABLE public.sports_games_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_odds_cache ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS (dados de cache são públicos para leitura)
CREATE POLICY "Qualquer um pode ver cache de jogos" 
ON public.sports_games_cache 
FOR SELECT 
USING (true);

CREATE POLICY "Sistema pode inserir cache de jogos" 
ON public.sports_games_cache 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar cache de jogos" 
ON public.sports_games_cache 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode ver cache de odds" 
ON public.sports_odds_cache 
FOR SELECT 
USING (true);

CREATE POLICY "Sistema pode inserir cache de odds" 
ON public.sports_odds_cache 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar cache de odds" 
ON public.sports_odds_cache 
FOR UPDATE 
USING (true);

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_sports_games_cache_updated_at
BEFORE UPDATE ON public.sports_games_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sports_odds_cache_updated_at
BEFORE UPDATE ON public.sports_odds_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.sports_games_cache WHERE expires_at < now();
  DELETE FROM public.sports_odds_cache WHERE expires_at < now();
END;
$$;