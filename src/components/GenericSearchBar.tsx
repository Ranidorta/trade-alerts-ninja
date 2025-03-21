
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface GenericSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  buttonText?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  initialValue?: string;
}

const GenericSearchBar = ({
  onSearch,
  placeholder = "Search...",
  buttonText = "Search",
  isLoading = false,
  icon = <Search className="h-4 w-4 mr-2" />,
  initialValue = ""
}: GenericSearchBarProps) => {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full"
          autoFocus
        />
      </div>
      <Button 
        type="submit" 
        disabled={isLoading || !query.trim()}
        className="shrink-0"
      >
        {icon}
        {isLoading ? "Loading..." : buttonText}
      </Button>
    </form>
  );
};

export default GenericSearchBar;
