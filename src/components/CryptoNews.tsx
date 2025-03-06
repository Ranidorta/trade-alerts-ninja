
import React from "react";
import { CryptoNews as CryptoNewsType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewspaperIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CryptoNewsProps {
  news: CryptoNewsType[] | null;
  isLoading: boolean;
}

const CryptoNews: React.FC<CryptoNewsProps> = ({ news, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Latest Crypto News</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse border-b pb-4 last:border-0 last:pb-0">
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!news || news.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Latest Crypto News</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">No news articles available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <NewspaperIcon className="h-5 w-5" />
          <span>Latest Crypto News</span>
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.open("https://cointelegraph.com.br/", "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver mais
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((article, index) => (
          <a
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 hover:scale-[1.01] transition-transform"
          >
            <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
              <img 
                src={article.urlToImage || "https://via.placeholder.com/300x200?text=Crypto+News"} 
                alt={article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-4 text-white">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center text-white text-xs font-bold">
                    {article.source.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{article.source.name}</p>
                    <p className="text-xs opacity-80">
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold mb-2 line-clamp-2">{article.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {article.description}
              </p>
              <div className="flex justify-end">
                <span className="text-xs text-primary font-medium flex items-center">
                  Ler mais <ExternalLink className="h-3 w-3 ml-1" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
      
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h3 className="font-bold mb-4 text-center">Últimas Atualizações do Cointelegraph</h3>
        <iframe 
          src="https://cointelegraph.com.br/rss/" 
          className="w-full h-[500px] border rounded-lg"
          title="Cointelegraph News"
        />
      </div>
    </div>
  );
};

export default CryptoNews;
