
import React from "react";
import { CryptoNews as CryptoNewsType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewspaperIcon } from "lucide-react";

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
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <NewspaperIcon className="h-5 w-5" />
          <span>Latest Crypto News</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {news.map((article, index) => (
            <a
              key={index}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-b pb-4 last:border-0 last:pb-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-6 px-6 transition-colors"
            >
              <div className="space-y-1">
                <h3 className="font-medium line-clamp-2">{article.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {article.description}
                </p>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{article.source.name}</span>
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CryptoNews;
