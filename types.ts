
export enum MealType {
  Breakfast = 'Café da Manhã',
  Lunch = 'Almoço',
  Dinner = 'Jantar',
  Snacks = 'Lanches',
}

export const MEAL_TYPES_ORDER: MealType[] = [MealType.Breakfast, MealType.Lunch, MealType.Dinner, MealType.Snacks];

export interface FoodItem {
  name: string;
  calories: number;
}

// Novo tipo para o feedback estruturado
export interface MealFeedback {
  title: string;
  analysis: string;
  suggestion: string;
}

export interface AnalyzedMealResponse {
  items: FoodItem[];
  feedback: MealFeedback; // Alterado de string para o novo tipo
}

export interface Meal extends AnalyzedMealResponse {
  totalCalories: number;
  description: string; 
}

export type DailyLog = {
  [key in MealType]?: Meal;
};

export type DiaryLogs = {
  [date: string]: DailyLog;
};

// Novos tipos
export interface UserProfile {
  initialWeight?: number;
  currentWeight?: number;
  targetWeight?: number;
  height?: number; // em cm
}

export interface User {
  uid: string; // ID único do Firebase
  name: string;
  email: string;
  profile?: UserProfile;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}