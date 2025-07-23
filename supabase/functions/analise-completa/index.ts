import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DadosPartida {
  home_team: string;
  away_team: string;
  media_gols_home: number;
  media_gols_away: number;
  media_escanteios_home: number;
  media_escanteios_away: number;
  prob_vitoria_home: number;
  prob_empate: number;
  prob_vitoria_away: number;
}

function calcularProbabilidadesCompletas(dados: DadosPartida) {
  const { home_team: home, away_team: away } = dados;
  const { prob_vitoria_home: p_home, prob_empate: p_draw, prob_vitoria_away: p_away } = dados;

  // Lógica de recomendação Lay/Back
  let recomendacao_vencedor: string;
  if (p_home > 0.65) {
    recomendacao_vencedor = `Back ${home}`;
  } else if (p_away < 0.20) {
    recomendacao_vencedor = `Lay ${away}`;
  } else if (p_draw > 0.35) {
    recomendacao_vencedor = "Lay Empate";
  } else {
    recomendacao_vencedor = "Sem entrada clara";
  }

  // Gols esperados
  const media_gols_total = (dados.media_gols_home + dados.media_gols_away) / 2;
  let recomendacao_gols: string;
  if (media_gols_total >= 2.5) {
    recomendacao_gols = "Back Over 2.5 gols";
  } else if (media_gols_total >= 1.5) {
    recomendacao_gols = "Back Over 1.5 gols";
  } else {
    recomendacao_gols = "Lay Over 2.5 gols";
  }

  // Escanteios
  const media_escanteios = dados.media_escanteios_home + dados.media_escanteios_away;
  let recomendacao_escanteios: string;
  if (media_escanteios >= 10) {
    recomendacao_escanteios = "Back Over 9.5 escanteios";
  } else {
    recomendacao_escanteios = "Lay Over 10.5 escanteios";
  }

  return {
    partida: `${home} vs ${away}`,
    mercados: {
      "Vencedor": {
        probabilidades: {
          [home]: Math.round(p_home * 100) / 100,
          "Empate": Math.round(p_draw * 100) / 100,
          [away]: Math.round(p_away * 100) / 100
        },
        recomendacao: recomendacao_vencedor
      },
      "Gols": {
        media_gols_total: Math.round(media_gols_total * 100) / 100,
        recomendacao: recomendacao_gols
      },
      "Escanteios": {
        media_escanteios_total: Math.round(media_escanteios * 10) / 10,
        recomendacao: recomendacao_escanteios
      }
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let fixture_id = url.searchParams.get('fixture_id');

    // Se não encontrar na URL, tenta buscar no body
    if (!fixture_id) {
      const body = await req.json();
      fixture_id = body.fixture_id;
    }

    if (!fixture_id) {
      return new Response(
        JSON.stringify({ error: 'fixture_id é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Analisando fixture_id: ${fixture_id}`);

    // Mapeamento dos jogos reais baseado no fixture_id
    const gamesMapping: Record<string, { home: string, away: string }> = {
      "1351193": { home: "Fluminense", away: "Palmeiras" },
      "1351201": { home: "Ceara", away: "Mirassol" },
      "1351195": { home: "Corinthians", away: "Cruzeiro" },
      "1351196": { home: "Santos", away: "Internacional" },
      "1351200": { home: "Vitoria", away: "Sport Recife" },
      "1351197": { home: "RB Bragantino", away: "Flamengo" },
      "1351199": { home: "Gremio", away: "Botafogo" },
      "1351194": { home: "Vasco DA Gama", away: "Bahia" },
      "1351198": { home: "Atletico-MG", away: "Fortaleza EC" },
      "1351202": { home: "Juventude", away: "Sao Paulo" },
      "1351204": { home: "Botafogo", away: "Corinthians" },
      "1351212": { home: "Sport Recife", away: "Santos" },
      "1351211": { home: "Fortaleza EC", away: "RB Bragantino" },
      "1351207": { home: "Mirassol", away: "Vitoria" },
      "1351205": { home: "Palmeiras", away: "Gremio" },
      "1351206": { home: "Sao Paulo", away: "Fluminense" },
      "1351208": { home: "Cruzeiro", away: "Ceara" },
      "1351210": { home: "Bahia", away: "Juventude" },
      "1351209": { home: "Internacional", away: "Vasco DA Gama" },
      "1351203": { home: "Flamengo", away: "Atletico-MG" },
      "1351179": { home: "Gremio", away: "Fortaleza EC" }
    };

    // Buscar o jogo específico ou usar um padrão
    const selectedTeams = gamesMapping[fixture_id] || { home: "Time A", away: "Time B" };
    
    console.log(`🔍 Times selecionados para ${fixture_id}: ${selectedTeams.home} vs ${selectedTeams.away}`);

    // Gerar probabilidades e médias baseadas no seed
    const seed = parseInt(fixture_id) || 1;
    const random1 = ((seed * 9301 + 49297) % 233280) / 233280;
    const random2 = ((seed * 1103 + 7919) % 211111) / 211111;
    const random3 = ((seed * 2203 + 3331) % 188888) / 188888;

    const prob_home = Math.round((0.3 + random1 * 0.5) * 100) / 100;
    const prob_away = Math.round((0.15 + random2 * 0.35) * 100) / 100;
    const prob_empate = Math.round((1 - prob_home - prob_away) * 100) / 100;

    const dados_partida: DadosPartida = {
      home_team: selectedTeams.home,
      away_team: selectedTeams.away,
      media_gols_home: Math.round((1.0 + random1 * 1.5) * 10) / 10,
      media_gols_away: Math.round((0.8 + random2 * 1.2) * 10) / 10,
      media_escanteios_home: Math.round((4.0 + random1 * 3.0) * 10) / 10,
      media_escanteios_away: Math.round((3.5 + random2 * 3.5) * 10) / 10,
      prob_vitoria_home: prob_home,
      prob_empate: prob_empate,
      prob_vitoria_away: prob_away
    };

    const resultado = calcularProbabilidadesCompletas(dados_partida);

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na análise completa:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});