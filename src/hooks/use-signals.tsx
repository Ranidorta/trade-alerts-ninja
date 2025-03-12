
import { useQuery } from "@tanstack/react-query";
import { getMockSignals } from "@/lib/mockData";

export const useSignals = () => {
  return useQuery({
    queryKey: ["signals"],
    queryFn: getMockSignals,
  });
};
