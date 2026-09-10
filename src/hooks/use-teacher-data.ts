import { useQuery } from "@tanstack/react-query";
import { listCloudAttempts, listTeacherQuizzes } from "@/lib/cloud";
import { useAuth } from "./use-auth";

export function useTeacherQuizzes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-quizzes", user?.uid],
    enabled: Boolean(user),
    queryFn: () => listTeacherQuizzes(user!.uid),
  });
}

export function useTeacherAttempts(quizIds: string[]) {
  return useQuery({
    queryKey: ["admin-attempts", quizIds.slice().sort().join(",")],
    enabled: quizIds.length >= 0,
    queryFn: () => listCloudAttempts(quizIds),
  });
}
