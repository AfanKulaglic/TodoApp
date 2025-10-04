import type { Task } from "../types";

export function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce((groups, task) => {
    const dateKey = task.created_at ? task.created_at.split("T")[0] : "Nepoznat datum";
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(task);
    return groups;
  }, {} as Record<string, Task[]>);
}
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("bs-BA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
