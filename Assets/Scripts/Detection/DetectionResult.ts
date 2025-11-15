export type FoodDetectionResult = {
  name: string;
  center: [number, number];
  calories: number;
  quality: "healthy" | "unhealthy" | "neutral";
};
