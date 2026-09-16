import { Student } from "@/types";

export const demoStudent: Student = {
  id: "demo-tanya",
  name: "Tanya",
  email: "demo@reasontrace.app",
  overallMastery: 68,
};

export const demoConceptMastery: { concept: string; mastery: number }[] = [
  { concept: "Linear Equations", mastery: 43 },
  { concept: "Fractions", mastery: 84 },
  { concept: "Graphs", mastery: 78 },
  { concept: "Arithmetic", mastery: 91 },
];

export const demoStats = {
  questionsCompleted: 24,
  conceptsImproved: 6,
  currentFocus: "Linear Equations",
};
