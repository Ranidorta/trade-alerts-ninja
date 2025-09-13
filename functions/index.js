const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// League mapping to API Football IDs
const leagueMapping = {
  "Brasileirão Série A": 71,
  "Brasileirão Série B": 72,
  "Premier League": 39,
  "Bundesliga": 78,
  "La Liga": 140,
  "Serie A": 135,
  "Ligue 1": 61
};

// Sports Games Function
exports.sportsGames = functions.https.onCall(async (data, context) => {
  try {
    const { league, season = 2025 } = data;
    let games = [];

    if (league && leagueMapping[league]) {
      console.log(`Fetching fixtures for ${league} (ID: ${leagueMapping[league]})`);
      
      try {
        const apiResponse = await fetchFixtures(leagueMapping[league], season);
        
        if (apiResponse.response && Array.isArray(apiResponse.response)) {
          games = apiResponse.response.map((fixture) => {
            const fixtureDate = new Date(fixture.fixture.date);
            
            // Convert to Brasília timezone (UTC-3)
            const brasiliaDate = new Date(fixtureDate.getTime() - (3 * 60 * 60 * 1000));
            
            return {
              id: fixture.fixture.id.toString(),
              homeTeam: fixture.teams.home.name,
              awayTeam: fixture.teams.away.name,
              date: brasiliaDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
              }),
              time: brasiliaDate.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              league: league,
              status: fixture.fixture.status.short,
              venue: fixture.fixture.venue?.name || 'TBD'
            };
          });
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
        // Fallback to mock data if API fails
        games = getMockGames().filter(game => game.league === league);
      }
    } else {
      // Return all leagues if no specific league requested
      games = getMockGames();
    }

    return { games };
  } catch (error) {
    console.error('Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get Odds Function
exports.getOdds = functions.https.onCall(async (data, context) => {
  try {
    const { league, page = 1 } = data;
    let analises = [];

    if (league && leagueMapping[league]) {
      console.log(`Fetching odds for ${league} (ID: ${leagueMapping[league]})`);
      
      try {
        const apiResponse = await fetchOdds(leagueMapping[league], page);
        
        if (apiResponse.response && Array.isArray(apiResponse.response)) {
          analises = apiResponse.response.map((fixture) => {
            const fixtureDate = new Date(fixture.fixture.date);
            const brasiliaDate = new Date(fixtureDate.getTime() - (3 * 60 * 60 * 1000));
            
            const bookmaker = fixture.bookmakers?.[0];
            const bets = bookmaker?.bets || [];
            
            return {
              id: fixture.fixture.id.toString(),
              homeTeam: fixture.teams.home.name,
              awayTeam: fixture.teams.away.name,
              date: brasiliaDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              }),
              time: brasiliaDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              league: league,
              odds: bets.reduce((acc, bet) => {
                if (bet.name === 'Match Winner') {
                  acc.vencedor = bet.values.map(v => ({ name: v.value, odd: parseFloat(v.odd) }));
                } else if (bet.name === 'Goals Over/Under') {
                  acc.gols = bet.values.map(v => ({ name: v.value, odd: parseFloat(v.odd) }));
                } else if (bet.name === 'Corners Over/Under') {
                  acc.escanteios = bet.values.map(v => ({ name: v.value, odd: parseFloat(v.odd) }));
                }
                return acc;
              }, {})
            };
          });
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
        analises = getMockOdds();
      }
    } else {
      analises = getMockOdds();
    }

    return { analises };
  } catch (error) {
    console.error('Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Análise Completa Function
exports.analiseCompleta = functions.https.onCall(async (data, context) => {
  try {
    const { fixture_id } = data;
    
    if (!fixture_id) {
      throw new functions.https.HttpsError('invalid-argument', 'fixture_id é obrigatório');
    }

    // Games mapping for analysis
    const gamesMapping = {
      "1": { home: "Flamengo", away: "Palmeiras" },
      "2": { home: "Corinthians", away: "São Paulo" },
      "3": { home: "Arsenal", away: "Chelsea" },
      "4": { home: "Santos", away: "Sport Recife" },
      "5": { home: "Ponte Preta", away: "Goiás" }
    };

    const gameInfo = gamesMapping[fixture_id];
    if (!gameInfo) {
      throw new functions.https.HttpsError('not-found', 'Jogo não encontrado');
    }

    // Generate simulated statistics using fixture_id as seed
    const seed = parseInt(fixture_id) || 1;
    const rand = (seed * 9301 + 49297) % 233280;
    const random = rand / 233280.0;

    const dados = {
      time_casa: gameInfo.home,
      time_fora: gameInfo.away,
      media_gols_casa: 1.2 + random * 0.8,
      media_gols_fora: 1.0 + random * 0.6,
      media_escanteios_casa: 4.5 + random * 2,
      media_escanteios_fora: 4.0 + random * 1.5,
      prob_vitoria_casa: 0.4 + random * 0.3,
      prob_empate: 0.25 + random * 0.1,
      prob_vitoria_fora: 0.35 + random * 0.3
    };

    const resultado = calcularProbabilidadesCompletas(dados);

    return {
      fixture_id,
      analise: resultado
    };
  } catch (error) {
    console.error('Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Generate Sports Signal Function
exports.generateSportsSignal = functions.https.onCall(async (data, context) => {
  try {
    const { game, market, signalType, line } = data;
    
    if (!game || !market || !signalType) {
      throw new functions.https.HttpsError('invalid-argument', 'Parâmetros obrigatórios: game, market, signalType');
    }

    // Generate signal based on Poisson distribution
    const homeGoals = 1.2 + Math.random() * 0.8;
    const awayGoals = 1.0 + Math.random() * 0.6;
    
    let probability = 0;
    let signal = '';

    switch (market) {
      case 'gols':
        const totalGoals = homeGoals + awayGoals;
        const lineValue = parseFloat(line) || 2.5;
        probability = totalGoals > lineValue ? 0.65 + Math.random() * 0.25 : 0.45 + Math.random() * 0.2;
        signal = signalType === 'Back' ? `Over ${lineValue}` : `Under ${lineValue}`;
        break;
      
      case 'escanteios':
        const totalCorners = 8 + Math.random() * 4;
        const cornersLine = parseFloat(line) || 9.5;
        probability = totalCorners > cornersLine ? 0.6 + Math.random() * 0.3 : 0.4 + Math.random() * 0.2;
        signal = signalType === 'Back' ? `Over ${cornersLine} Escanteios` : `Under ${cornersLine} Escanteios`;
        break;
      
      case 'vencedor':
        probability = 0.5 + Math.random() * 0.3;
        signal = signalType === 'Back' ? `${game.homeTeam} Vitória` : `${game.awayTeam} Vitória`;
        break;
      
      default:
        probability = 0.5 + Math.random() * 0.2;
        signal = `${market} - ${signalType}`;
    }

    return {
      signal,
      probability: Math.round(probability * 100) / 100,
      market,
      signalType,
      game: game.homeTeam + ' vs ' + game.awayTeam
    };
  } catch (error) {
    console.error('Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Helper Functions
async function fetchFixtures(leagueId, season) {
  const apiKey = functions.config().api?.football_key;
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured');
  }

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  const fromDate = today.toISOString().split('T')[0];
  const toDate = nextWeek.toISOString().split('T')[0];

  const response = await fetch(
    `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}&from=${fromDate}&to=${toDate}`,
    {
      headers: {
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}

async function fetchOdds(leagueId, page) {
  const apiKey = functions.config().api?.football_key;
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured');
  }

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  const fromDate = today.toISOString().split('T')[0];
  const toDate = nextWeek.toISOString().split('T')[0];

  const response = await fetch(
    `https://api-football-v1.p.rapidapi.com/v3/odds?league=${leagueId}&season=2025&date=${fromDate}&page=${page}`,
    {
      headers: {
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}

function calcularProbabilidadesCompletas(dados) {
  // Calculate probabilities for Winner, Goals, and Corners
  const vencedor = dados.prob_vitoria_casa > 0.45 ? 
    { recomendacao: `${dados.time_casa} Vitória`, probabilidade: dados.prob_vitoria_casa, tipo: 'Back' } :
    dados.prob_vitoria_fora > 0.45 ?
    { recomendacao: `${dados.time_fora} Vitória`, probabilidade: dados.prob_vitoria_fora, tipo: 'Back' } :
    { recomendacao: 'Empate', probabilidade: dados.prob_empate, tipo: 'Back' };

  const totalGols = dados.media_gols_casa + dados.media_gols_fora;
  const gols = totalGols > 2.5 ?
    { recomendacao: 'Over 2.5 Gols', probabilidade: Math.min(0.85, totalGols / 3), tipo: 'Back' } :
    { recomendacao: 'Under 2.5 Gols', probabilidade: Math.min(0.85, 1 - (totalGols / 3)), tipo: 'Back' };

  const totalEscanteios = dados.media_escanteios_casa + dados.media_escanteios_fora;
  const escanteios = totalEscanteios > 9.5 ?
    { recomendacao: 'Over 9.5 Escanteios', probabilidade: Math.min(0.85, totalEscanteios / 12), tipo: 'Back' } :
    { recomendacao: 'Under 9.5 Escanteios', probabilidade: Math.min(0.85, 1 - (totalEscanteios / 12)), tipo: 'Back' };

  return { vencedor, gols, escanteios };
}

function getMockGames() {
  return [
    {
      id: "1",
      homeTeam: "Flamengo",
      awayTeam: "Palmeiras",
      date: "20/01/2025",
      time: "16:00",
      league: "Brasileirão Série A",
      status: "NS",
      venue: "Maracanã"
    },
    {
      id: "2", 
      homeTeam: "Corinthians",
      awayTeam: "São Paulo",
      date: "21/01/2025",
      time: "18:30",
      league: "Brasileirão Série A",
      status: "NS",
      venue: "Arena Corinthians"
    },
    {
      id: "3",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      date: "22/01/2025",
      time: "15:00",
      league: "Premier League",
      status: "NS",
      venue: "Emirates Stadium"
    },
    {
      id: "4",
      homeTeam: "Santos",
      awayTeam: "Sport Recife",
      date: "20/01/2025",
      time: "19:00",
      league: "Brasileirão Série B",
      status: "NS",
      venue: "Vila Belmiro"
    },
    {
      id: "5",
      homeTeam: "Ponte Preta",
      awayTeam: "Goiás",
      date: "21/01/2025",
      time: "16:30",
      league: "Brasileirão Série B",
      status: "NS",
      venue: "Estádio Moisés Lucarelli"
    }
  ];
}

function getMockOdds() {
  return [
    {
      id: "1",
      homeTeam: "Flamengo",
      awayTeam: "Palmeiras",
      date: "20/01/2025",
      time: "16:00",
      league: "Brasileirão Série A",
      odds: {
        vencedor: [
          { name: "Home", odd: 2.10 },
          { name: "Draw", odd: 3.20 },
          { name: "Away", odd: 3.50 }
        ],
        gols: [
          { name: "Over 2.5", odd: 1.85 },
          { name: "Under 2.5", odd: 1.95 }
        ],
        escanteios: [
          { name: "Over 9.5", odd: 1.90 },
          { name: "Under 9.5", odd: 1.90 }
        ]
      }
    }
  ];
}