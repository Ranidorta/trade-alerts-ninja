import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { league, season } = await req.json()
    
    // Mock data for MVP - replace with actual API call
    const mockGames = [
      {
        id: "1",
        homeTeam: "Flamengo",
        awayTeam: "Palmeiras",
        date: "2024-01-20",
        time: "16:00",
        league: "Brasileirão Série A"
      },
      {
        id: "2", 
        homeTeam: "Corinthians",
        awayTeam: "São Paulo",
        date: "2024-01-21",
        time: "18:30",
        league: "Brasileirão Série A"
      },
      {
        id: "3",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        date: "2024-01-22",
        time: "15:00",
        league: "Premier League"
      }
    ]

    const filteredGames = mockGames.filter(game => 
      !league || game.league === league
    )

    return new Response(
      JSON.stringify({ games: filteredGames }),
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