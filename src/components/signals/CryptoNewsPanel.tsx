
import { useEffect, useState } from "react";
import { fetchCryptoNews } from "@/lib/apiServices";
import { CryptoNews } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Newspaper, Loader2 } from "lucide-react";

interface CryptoNewsPanelProps {
  symbol: string;
}

export default function CryptoNewsPanel({ symbol }: CryptoNewsPanelProps) {
  const [news, setNews] = useState<CryptoNews[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      if (!symbol) return;

      setIsLoading(true);
      setError(null);

      try {
        const newsData = await fetchCryptoNews();
        
        // Filter news to try to find relevant ones for the symbol
        // This is just a simple filter since the mock API doesn't support symbol filtering
        const tokenName = symbol.replace('USDT', '').toLowerCase();
        const filteredNews = newsData.filter(item => 
          item.title.toLowerCase().includes(tokenName) || 
          item.description.toLowerCase().includes(tokenName)
        );
        
        // If no specific news found, just show all news
        setNews(filteredNews.length > 0 ? filteredNews : newsData);
      } catch (err) {
        console.error("Error fetching crypto news:", err);
        setError("Não foi possível carregar notícias");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [symbol]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          Notícias Relacionadas
        </CardTitle>
        <CardDescription>
          Últimas notícias sobre {symbol.replace("USDT", "")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-[180px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-[180px] text-center px-4">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : news.length === 0 ? (
          <div className="flex justify-center items-center h-[180px] text-center px-4">
            <p className="text-sm text-muted-foreground">Nenhuma notícia encontrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="px-6 py-2">
              {news.map((item, index) => (
                <div 
                  key={`${item.url}-${index}`} 
                  className="mb-4 last:mb-2 border-b last:border-0 pb-4 last:pb-0"
                >
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <h3 className="text-sm font-medium mb-1 group-hover:text-primary group-hover:underline">
                      {item.title}
                      <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-50 group-hover:opacity-100" />
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span>{item.source.name}</span>
                      <span>
                        {formatDistanceToNow(new Date(item.publishedAt), { 
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
