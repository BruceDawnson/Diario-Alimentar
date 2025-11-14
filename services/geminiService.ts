import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedMealResponse, FoodItem, MealFeedback } from '../types.ts';

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Esquema para um único item alimentar
const foodItemSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "Nome do item alimentar.",
    },
    calories: {
      type: Type.INTEGER,
      description: "Calorias estimadas para o item alimentar, arredondadas para o número inteiro mais próximo.",
    },
  },
  required: ["name", "calories"],
};

// Esquema apenas para o feedback da refeição completa
const feedbackSchema = {
    type: Type.OBJECT,
    description: "Um feedback nutricional estruturado sobre a refeição em Português (Brasil).",
    properties: {
        title: {
            type: Type.STRING,
            description: "Um título curto, positivo e encorajador para o feedback (ex: 'Ótima fonte de proteína!').",
        },
        analysis: {
            type: Type.STRING,
            description: "Uma análise nutricional de 2-3 frases sobre os pontos positivos e a melhorar da refeição.",
        },
        suggestion: {
            type: Type.STRING,
            description: "Uma sugestão prática e específica sobre como tornar a refeição ainda mais alinhada a objetivos comuns de saúde (como perda de peso ou ganho de massa muscular)."
        }
    },
    required: ["title", "analysis", "suggestion"],
};


/**
 * Analisa uma string de um único item alimentar para obter seu nome e calorias.
 * A consistência é agora forçada na IA com temperature 0 e uma seed fixa.
 * @param description A descrição de um único item (ex: "1 pão francês com manteiga").
 * @returns Uma promessa que resolve para um objeto FoodItem.
 */
export const analyzeSingleFoodItem = async (description: string): Promise<FoodItem> => {
    const normalizedDescription = description.trim().toLowerCase();
    
    if (!normalizedDescription) {
        return { name: `${description} (inválido)`, calories: 0 };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                 systemInstruction: `Você é um assistente de análise nutricional. Sua tarefa é extrair o nome e as calorias de um único item alimentar. Seja consistente: para a mesma descrição, sempre retorne o mesmo valor calórico. Responda APENAS com o objeto JSON.`,
                responseMimeType: "application/json",
                responseSchema: foodItemSchema,
                temperature: 0, // Força a IA a ser o mais determinística possível
                topK: 1,
                seed: 42,      // Garante que, para a mesma entrada, a saída seja a mesma
            },
            contents: `Analise este item: ${normalizedDescription}`,
        });
        const parsedResponse = JSON.parse(response.text.trim());
        if (parsedResponse && typeof parsedResponse.name === 'string' && typeof parsedResponse.calories === 'number') {
            return parsedResponse as FoodItem;
        }
        throw new Error("Resposta inválida para item alimentar.");
    } catch(error) {
        console.error(`Erro ao analisar item "${normalizedDescription}":`, error);
        return { name: `${description} (erro na análise)`, calories: 0 };
    }
};

/**
 * Gera um feedback nutricional para a descrição completa da refeição.
 * @param fullDescription A descrição completa da refeição.
 * @returns Uma promessa que resolve para um objeto MealFeedback.
 */
export const generateMealFeedback = async (fullDescription: string): Promise<MealFeedback> => {
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `Você é um nutricionista virtual. Sua tarefa é fornecer um feedback útil e encorajador sobre a refeição descrita. Foque em uma análise geral e uma sugestão prática. Responda APENAS com o objeto JSON.`,
                responseMimeType: "application/json",
                responseSchema: feedbackSchema,
                temperature: 0.7, 
            },
            contents: `Gere um feedback para esta refeição: ${fullDescription}`,
        });
        const parsedResponse = JSON.parse(response.text.trim());
        const fb = parsedResponse;
        if (fb && typeof fb.title === 'string' && typeof fb.analysis === 'string' && typeof fb.suggestion === 'string') {
             return parsedResponse as MealFeedback;
        }
        throw new Error("Resposta de feedback inválida.");
    } catch(error) {
        console.error(`Erro ao gerar feedback para "${fullDescription}":`, error);
        return {
            title: "Análise Indisponível",
            analysis: "Não foi possível analisar os detalhes nutricionais desta refeição no momento.",
            suggestion: "Tente novamente mais tarde para obter uma sugestão personalizada."
        };
    }
};


/**
 * Orquestra a análise completa da refeição. O cache foi removido para simplificar
 * e eliminar uma fonte de bugs.
 * @param description A descrição completa da refeição, com itens separados por vírgula ou quebra de linha.
 * @returns Uma promessa que resolve para um objeto AnalyzedMealResponse completo.
 */
export const analyzeMeal = async (description: string): Promise<AnalyzedMealResponse> => {
    const itemsToAnalyze = description.split(/,|\n/).map(s => s.trim()).filter(Boolean);

    if (itemsToAnalyze.length === 0) {
        throw new Error("Por favor, descreva os itens da sua refeição.");
    }

    try {
        const [analyzedItems, feedback] = await Promise.all([
            Promise.all(itemsToAnalyze.map(itemDesc => analyzeSingleFoodItem(itemDesc))),
            generateMealFeedback(description)
        ]);
        
        return { items: analyzedItems, feedback };

    } catch (error) {
        console.error("Erro geral ao orquestrar a análise da refeição:", error);
        throw new Error("Não foi possível analisar a refeição. Verifique sua conexão e tente novamente.");
    }
};
