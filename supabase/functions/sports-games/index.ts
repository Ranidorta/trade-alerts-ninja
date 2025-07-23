import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// League mapping to API Football IDs
const leagueMapping: Record<string, number> = {
  "Brasileirão Série A": 71,
  "Premier League": 39,
  "Bundesliga": 78,
  "La Liga": 140,
  "Serie A": 135,
  "Ligue 1": 61
}

async function fetchFixtures(leagueId: number, season: number) {
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured')
  }

  // Get current date and next 7 days
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  const fromDate = today.toISOString().split('T')[0]
  const toDate = nextWeek.toISOString().split('T')[0]

  console.log(`Fetching fixtures for league ${leagueId} from ${fromDate} to ${toDate}`)

  const response = await fetch(
    `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}&from=${fromDate}&to=${toDate}`,
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { league, season = 2025 } = await req.json()
    
    let games = []

    if (league && leagueMapping[league]) {
      console.log(`Fetching fixtures for ${league} (ID: ${leagueMapping[league]})`)
      
      try {
        const apiResponse = await fetchFixtures(leagueMapping[league], season)
        
        if (apiResponse.response && Array.isArray(apiResponse.response)) {
          games = apiResponse.response.map((fixture: any) => {
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
            }
          })
        }
      } catch (apiError) {
        console.error('API Error:', apiError)
        // Fallback to mock data if API fails
        games = getMockGames().filter(game => game.league === league)
      }
    } else {
      // Return all leagues if no specific league requested
      games = getMockGames()
    }

    return new Response(
      JSON.stringify({ games }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

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
    }
  ]
}