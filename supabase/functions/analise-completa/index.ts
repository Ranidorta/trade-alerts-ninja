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
    const fixture_id = url.searchParams.get('fixture_id');

    if (!fixture_id) {
      return new Response(
        JSON.stringify({ error: 'fixture_id é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Simulação para MVP - dados baseados no fixture_id
    const dados_partida: DadosPartida = {
      home_team: "Palmeiras",
      away_team: "Fluminense", 
      media_gols_home: 1.7,
      media_gols_away: 1.1,
      media_escanteios_home: 5.6,
      media_escanteios_away: 4.8,
      prob_vitoria_home: 0.57,
      prob_empate: 0.25,
      prob_vitoria_away: 0.18
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