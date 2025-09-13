import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// League mapping to API Football IDs
const leagueMapping: Record<string, number> = {
  "Brasileirão Série A": 71,
  "Brasileirão Série B": 72,
  "Premier League": 39,
  "Bundesliga": 78,
  "La Liga": 140,
  "Serie A": 135,
  "Ligue 1": 61
}

async function fetchOdds(leagueId: number, page: number = 1) {
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured')
  }

  console.log(`Fetching odds for league ${leagueId}, page ${page}`)

  // Try the new API endpoint structure
  const response = await fetch(
    `https://api-football-v1.p.rapidapi.com/v3/odds?league=${leagueId}&season=2025&page=${page}`,
    {
      headers: {
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    }
  )

  console.log(`API Response status: ${response.status}`)

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`API Error: ${response.status} - ${errorText}`)
    throw new Error(`API request failed: ${response.status}`)
  }

  const data = await response.json()
  console.log('API Response data:', JSON.stringify(data, null, 2))
  return data
}

function getMockOdds() {
  return [
    {
      jogo: "Flamengo vs Palmeiras",
      horario: "25/01/2025 16:00",
      mercado: "Match Winner",
      analises: [
        {
          aposta: "Flamengo",
          odd: "2.10",
          probabilidade: "47.6%",
          valor_esperado: "Positivo"
        },
        {
          aposta: "Draw",
          odd: "3.40",
          probabilidade: "29.4%",
          valor_esperado: "Neutro"
        },
        {
          aposta: "Palmeiras",
          odd: "3.20",
          probabilidade: "31.3%",
          valor_esperado: "Negativo"
        }
      ]
    },
    {
      jogo: "São Paulo vs Corinthians",
      horario: "26/01/2025 13:00",
      mercado: "Total Goals",
      analises: [
        {
          aposta: "Over 2.5",
          odd: "1.85",
          probabilidade: "54.1%",
          valor_esperado: "Positivo"
        },
        {
          aposta: "Under 2.5",
          odd: "1.95",
          probabilidade: "51.3%",
          valor_esperado: "Neutro"
        }
      ]
    },
    {
      jogo: "Arsenal vs Chelsea",
      horario: "25/01/2025 12:00",
      mercado: "Match Winner",
      analises: [
        {
          aposta: "Arsenal",
          odd: "1.95",
          probabilidade: "51.3%",
          valor_esperado: "Positivo"
        },
        {
          aposta: "Draw",
          odd: "3.60",
          probabilidade: "27.8%",
          valor_esperado: "Neutro"
        },
        {
          aposta: "Chelsea",
          odd: "3.80",
          probabilidade: "26.3%",
          valor_esperado: "Negativo"
        }
      ]
    },
    {
      jogo: "Santos vs Sport Recife",
      horario: "24/01/2025 20:00",
      mercado: "Match Winner",
      analises: [
        {
          aposta: "Santos",
          odd: "1.75",
          probabilidade: "57.1%",
          valor_esperado: "Positivo"
        },
        {
          aposta: "Draw",
          odd: "3.50",
          probabilidade: "28.6%",
          valor_esperado: "Neutro"
        },
        {
          aposta: "Sport Recife",
          odd: "4.20",
          probabilidade: "23.8%",
          valor_esperado: "Negativo"
        }
      ]
    },
    {
      jogo: "Ponte Preta vs Goiás",
      horario: "25/01/2025 17:30",
      mercado: "Total Goals",
      analises: [
        {
          aposta: "Over 2.5",
          odd: "2.00",
          probabilidade: "50.0%",
          valor_esperado: "Neutro"
        },
        {
          aposta: "Under 2.5",
          odd: "1.80",
          probabilidade: "55.6%",
          valor_esperado: "Positivo"
        }
      ]
    }
  ]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { league, page = 1 } = await req.json()
    
    let analises = []

    if (league && leagueMapping[league]) {
      console.log(`Fetching odds for ${league} (ID: ${leagueMapping[league]})`)
      
      try {
        const apiResponse = await fetchOdds(leagueMapping[league], page)
        
        // Check if API returned valid data
        if (apiResponse.response && Array.isArray(apiResponse.response)) {
          // Process real API data
          analises = apiResponse.response.map((item: any) => {
            const fixture = item.fixture || {}
            const homeTeam = fixture.teams?.home?.name || 'Home Team'
            const awayTeam = fixture.teams?.away?.name || 'Away Team'
            const matchDate = new Date(fixture.date || new Date())
            
            // Convert to Brasília timezone (UTC-3)
            const brasiliaDate = new Date(matchDate.getTime() - (3 * 60 * 60 * 1000))
            const matchTime = brasiliaDate.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric'
            }) + ' ' + brasiliaDate.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })

            const bookmakers = item.bookmakers || []
            const analyses = []

            for (const bookmaker of bookmakers) {
              for (const bet of bookmaker.bets || []) {
                if (bet.name === "Match Winner") {
                  for (const value of bet.values || []) {
                    analyses.push({
                      aposta: value.value,
                      odd: value.odd,
                      probabilidade: `${(100 / parseFloat(value.odd)).toFixed(1)}%`,
                      valor_esperado: parseFloat(value.odd) > 2.0 ? "Positivo" : "Neutro"
                    })
                  }
                }
              }
            }

            return {
              jogo: `${homeTeam} vs ${awayTeam}`,
              horario: matchTime,
              mercado: "Match Winner",
              analises: analyses.length > 0 ? analyses : [
                {
                  aposta: homeTeam,
                  odd: "2.00",
                  probabilidade: "50.0%",
                  valor_esperado: "Neutro"
                }
              ]
            }
          }).filter(item => item.analises.length > 0)
        }
      } catch (apiError) {
        console.error('API Error:', apiError)
        // Fallback to mock data if API fails
        analises = getMockOdds().filter(item => {
          if (league === "Brasileirão Série A") {
            return item.jogo.includes("Flamengo") || item.jogo.includes("São Paulo")
          } else if (league === "Brasileirão Série B") {
            return item.jogo.includes("Santos") || item.jogo.includes("Ponte Preta")
          } else if (league === "Premier League") {
            return item.jogo.includes("Arsenal")
          }
          return false
        })
      }
    } else {
      // Return sample data for all leagues
      analises = getMockOdds()
    }

    return new Response(
      JSON.stringify({ analises }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        analises: getMockOdds()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})