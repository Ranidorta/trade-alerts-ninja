
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCryptoNews } from '@/lib/apiServices';
import { CryptoNews } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';

export interface CryptoNewsPanelProps {
  symbol?: string;
  isLoading?: boolean;
}

const CryptoNewsPanel: React.FC<CryptoNewsPanelProps> = ({ symbol, isLoading = false }) => {
  // Fetch crypto news
  const { data: news, isLoading: isLoadingNews } = useQuery({
    queryKey: ['cryptoNews'],
    queryFn: fetchCryptoNews,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter news by symbol if provided
  const filteredNews = React.useMemo(() => {
    if (!news) return [];
    if (!symbol) return news.slice(0, 5);
    
    const symbolWithoutPair = symbol.replace('USDT', '');
    return news.filter(item => 
      item.relatedCoins.some(coin => coin === symbolWithoutPair)
    ).slice(0, 5);
  }, [news, symbol]);

  const showLoading = isLoading || isLoadingNews;

  if (showLoading) {
    return (
      <div>
        <div className="p-4 border-b border-primary/10">
          <h2 className="text-lg font-semibold">Crypto News</h2>
        </div>
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 border-b border-primary/10">
        <h2 className="text-lg font-semibold">
          {symbol 
            ? `${symbol.replace('USDT', '')} News`
            : 'Crypto News'
          }
        </h2>
      </div>
      <div className="p-4">
        {filteredNews.length > 0 ? (
          <div className="space-y-4">
            {filteredNews.map((item: CryptoNews) => (
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                key={item.id}
                className="block hover:bg-primary/5 p-2 rounded-lg transition-colors"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground mt-1" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.summary}</p>
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  <span>{item.source}</span>
                  <span className="mx-1">•</span>
                  <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No news available{symbol ? ` for ${symbol.replace('USDT', '')}` : ''}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoNewsPanel;
