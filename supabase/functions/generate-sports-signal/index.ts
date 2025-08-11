import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Poisson probability calculation
function poissonProbability(lambda: number, k: number): number {
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k)
}

function factorial(n: number): number {
  if (n <= 1) return 1
  return n * factorial(n - 1)
}

function probabilityOverGoals(lambdaTotal: number, goalsLine: number): number {
  const goalsLineInt = Math.floor(goalsLine + 0.5)
  let probUnder = 0
  
  for (let i = 0; i < goalsLineInt; i++) {
    probUnder += poissonProbability(lambdaTotal, i)
  }
  
  return 1 - probUnder
}

async function getTeamStatistics(teamId: number, season: number = 2024) {
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured')
  }

  const response = await fetch(
    `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&season=${season}&league=71`,
    {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch team statistics: ${response.status}`)
  }

  return response.json()
}

async function getFixtureDetails(fixtureId: string) {
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured')
  }

  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
    {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch fixture details: ${response.status}`)
  }

  return response.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gameId, market, signalType, line } = await req.json()
    
    let avgHome = 1.8
    let avgAway = 1.2
    let cornersAvgHome = 5.5
    let cornersAvgAway = 4.8

    try {
      // Get fixture details to get team IDs
      const fixtureResponse = await getFixtureDetails(gameId)
      
      if (fixtureResponse.response && fixtureResponse.response[0]) {
        const fixture = fixtureResponse.response[0]
        const homeTeamId = fixture.teams.home.id
        const awayTeamId = fixture.teams.away.id

        // Get team statistics
        const [homeStats, awayStats] = await Promise.all([
          getTeamStatistics(homeTeamId),
          getTeamStatistics(awayTeamId)
        ])

        if (homeStats.response && awayStats.response) {
          // Calculate average goals from real statistics
          const homeGoalsFor = homeStats.response.goals?.for?.total?.home || 0
          const homeGamesHome = homeStats.response.fixtures?.played?.home || 1
          const awayGoalsFor = awayStats.response.goals?.for?.total?.away || 0
          const awayGamesAway = awayStats.response.fixtures?.played?.away || 1

          avgHome = homeGoalsFor / homeGamesHome
          avgAway = awayGoalsFor / awayGamesAway

          // Estimate corners based on attack/possession data
          cornersAvgHome = (homeStats.response.goals?.for?.total?.home || 0) * 0.6 + 3
          cornersAvgAway = (awayStats.response.goals?.for?.total?.away || 0) * 0.6 + 3
        }
      }
    } catch (apiError) {
      console.error('Error fetching real data, using fallback:', apiError)
      // Keep default mock values
    }

    let probability = 0
    let signalText = ""

    if (market === "goals") {
      const lineValue = parseFloat(line.replace("over_", "").replace("_", "."))
      const lambdaTotal = avgHome + avgAway
      probability = probabilityOverGoals(lambdaTotal, lineValue)
      signalText = `${signalType.toUpperCase()} Over ${lineValue} Goals`
    } else if (market === "corners") {
      const lineValue = parseFloat(line.replace("over_", "").replace("_", "."))
      const lambdaCorners = cornersAvgHome + cornersAvgAway
      probability = probabilityOverGoals(lambdaCorners, lineValue)
      signalText = `${signalType.toUpperCase()} Over ${lineValue} Corners`
    } else if (market === "winner") {
      // Simple probability based on goal averages
      const homeStrength = avgHome / (avgHome + avgAway)
      probability = homeStrength
      signalText = `${signalType.toUpperCase()} Home Win`
    }

    // Adjust probability for LAY bets (inverse)
    if (signalType === "lay") {
      probability = 1 - probability
    }

    // Ensure probability is between 0.1 and 0.9 for realistic betting
    probability = Math.max(0.1, Math.min(0.9, probability))

    return new Response(
      JSON.stringify({
        signal: signalText,
        probability: Math.round(probability * 100) / 100,
        gameId,
        market,
        signalType,
        avgHome: Math.round(avgHome * 100) / 100,
        avgAway: Math.round(avgAway * 100) / 100,
        timestamp: new Date().toISOString()
      }),
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