
import React, { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CryptoNews as CryptoNewsType } from "@/lib/types";
import { fetchCryptoNews } from "@/lib/apiServices";
import { useToast } from "@/hooks/use-toast";

const NewsBanner: React.FC = () => {
  const [stories, setStories] = useState<CryptoNewsType[]>([]);
  const [activeStory, setActiveStory] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadNews = async () => {
      setIsLoading(true);
      try {
        const newsData = await fetchCryptoNews();
        if (newsData && newsData.length > 0) {
          setStories(newsData.slice(0, 5));
        }
      } catch (error) {
        console.error("Error loading news:", error);
        toast({
          title: "Error",
          description: "Failed to load cryptocurrency news",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadNews();
  }, [toast]);

  const handleStoryClick = (index: number) => {
    setActiveStory(index);
  };

  if (isLoading) {
    return (
      <Card className="mb-6 bg-background shadow-md border-primary/10">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Notícias de Criptomoedas</h2>
              <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="relative flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-200 dark:bg-gray-700 animate-pulse"
                ></div>
              ))}
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden p-4 h-48 animate-pulse">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="space-y-2">
                  <div className="w-24 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="w-16 h-2 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
              <div className="w-3/4 h-5 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="w-5/6 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="w-4/6 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stories.length === 0) {
    return (
      <Card className="mb-6 bg-background shadow-md border-primary/10">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Notícias de Criptomoedas</h2>
              <Button 
                variant="outline" 
                size="sm" 
                className="shrink-0"
                onClick={() => window.open("https://cointelegraph.com.br/", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver mais
              </Button>
            </div>
            <p className="text-center text-muted-foreground py-8">
              Nenhuma notícia disponível no momento. Tente novamente mais tarde.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-background shadow-md border-primary/10">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Notícias de Criptomoedas</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="shrink-0"
              onClick={() => window.open("https://cointelegraph.com.br/", "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver mais
            </Button>
          </div>
          
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {stories.map((story, index) => (
              <button
                key={index}
                onClick={() => handleStoryClick(index)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 ${
                  activeStory === index ? "border-primary" : "border-gray-200"
                } transition-all duration-200 hover:scale-105`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50"></div>
                <img
                  src={story.urlToImage || "https://via.placeholder.com/150"}
                  alt={story.source.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
            <div className="flex">
              {/* Story progress indicators */}
              <div className="flex w-full px-1 pt-1 gap-1">
                {stories.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 rounded-full flex-1 ${
                      index === activeStory
                        ? "bg-primary"
                        : index < activeStory
                        ? "bg-gray-400"
                        : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  ></div>
                ))}
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20">
                  <img
                    src={stories[activeStory]?.urlToImage || "https://via.placeholder.com/50"}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">{stories[activeStory]?.source.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(stories[activeStory]?.publishedAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <h3 className="font-bold mb-2">{stories[activeStory]?.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {stories[activeStory]?.description}
              </p>
              
              <Button
                size="sm"
                onClick={() => window.open(stories[activeStory]?.url, "_blank")}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ler mais
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsBanner;
