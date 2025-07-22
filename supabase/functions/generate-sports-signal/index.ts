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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gameId, market, signalType, line } = await req.json()
    
    // Mock team averages - replace with actual data fetching
    const avgHome = 1.8
    const avgAway = 1.2
    const lambdaTotal = (avgHome + avgAway) / 2

    let probability = 0
    let signalText = ""

    if (market === "goals") {
      const lineValue = parseFloat(line.replace("over_", "").replace("_", "."))
      probability = probabilityOverGoals(lambdaTotal, lineValue)
      signalText = `${signalType.toUpperCase()} Over ${lineValue} Goals`
    } else if (market === "corners") {
      // Mock calculation for corners
      probability = 0.65
      signalText = `${signalType.toUpperCase()} Over ${line.replace("over_", "").replace("_", ".")} Corners`
    } else if (market === "winner") {
      // Mock calculation for winner
      probability = 0.55
      signalText = `${signalType.toUpperCase()} Home Win`
    }

    // Adjust probability for LAY bets (inverse)
    if (signalType === "lay") {
      probability = 1 - probability
    }

    return new Response(
      JSON.stringify({
        signal: signalText,
        probability: Math.round(probability * 100) / 100,
        gameId,
        market,
        signalType,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})