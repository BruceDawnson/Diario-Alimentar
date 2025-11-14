
import type { DailyLog, Meal, MealType, FoodItem } from './types.ts';

export interface DiaryState {
  dailyLog: DailyLog;
  isLoading: boolean; // Carregamento geral da página/dia
  isSubmitting: MealType | null; // Qual refeição está sendo salva/excluída
  error: { mealType?: MealType; message: string } | null;
  editingState: {
    mealType: MealType;
    items: FoodItem[];
  } | null;
}

export type DiaryAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: DailyLog }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SUBMIT_START'; payload: MealType }
  | { type: 'SAVE_SUCCESS'; payload: { mealType: MealType; meal: Meal } }
  | { type: 'DELETE_SUCCESS'; payload: { mealType: MealType } }
  | { type: 'SUBMIT_ERROR'; payload: { mealType: MealType; message: string } }
  | { type: 'START_EDIT'; payload: { mealType: MealType; items: FoodItem[] } }
  | { type: 'CANCEL_EDIT' }
  | { type: 'ADD_ITEM'; payload: FoodItem }
  | { type: 'REMOVE_ITEM'; payload: number } // payload is index
  | { type: 'UPDATE_ITEM'; payload: { index: number; item: FoodItem } };


export const initialDiaryState: DiaryState = {
  dailyLog: {},
  isLoading: true,
  isSubmitting: null,
  error: null,
  editingState: null,
};

export function diaryReducer(state: DiaryState, action: DiaryAction): DiaryState {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...initialDiaryState, // Reseta tudo ao trocar de dia
        isLoading: true,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isSubmitting: null, // Garante que spinners de carregamento sejam desativados
        error: null, // Limpa erros anteriores ao obter dados novos
        dailyLog: action.payload,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        isLoading: false,
        error: { message: action.payload },
      };
    
    case 'SUBMIT_START':
      return {
        ...state,
        isSubmitting: action.payload,
        error: null,
      };

    case 'SAVE_SUCCESS': {
      const { mealType, meal } = action.payload;
      return {
        ...state,
        isSubmitting: null,
        editingState: null,
        dailyLog: {
          ...state.dailyLog,
          [mealType]: meal,
        },
      };
    }
    
    case 'DELETE_SUCCESS': {
        const { mealType: mealTypeToDelete } = action.payload;
        
        // Constrói um novo objeto `dailyLog` omitindo a refeição excluída.
        // Esta é uma abordagem mais robusta e funcional do que usar `delete`.
        const newDailyLog = Object.entries(state.dailyLog)
            .filter(([key]) => key !== mealTypeToDelete)
            .reduce((acc, [key, value]) => {
                acc[key as MealType] = value;
                return acc;
            }, {} as DailyLog);

        return {
            ...state,
            isSubmitting: null,
            error: null,
            dailyLog: newDailyLog,
        };
    }

    case 'SUBMIT_ERROR':
      return {
        ...state,
        isSubmitting: null,
        error: {
          mealType: action.payload.mealType,
          message: action.payload.message,
        },
      };

    case 'START_EDIT':
      return {
        ...state,
        editingState: action.payload,
        error: null, // Limpa erros antigos ao começar a editar
      };

    case 'CANCEL_EDIT':
      return {
        ...state,
        editingState: null,
        error: null, // Limpa qualquer erro de submissão
      };

    case 'ADD_ITEM':
        if (!state.editingState) return state;
        return {
            ...state,
            editingState: {
                ...state.editingState,
                items: [...state.editingState.items, action.payload],
            },
        };

    case 'REMOVE_ITEM':
        if (!state.editingState) return state;
        return {
            ...state,
            editingState: {
                ...state.editingState,
                items: state.editingState.items.filter((_, index) => index !== action.payload),
            },
        };
    
    case 'UPDATE_ITEM':
         if (!state.editingState) return state;
         const newItems = [...state.editingState.items];
         newItems[action.payload.index] = action.payload.item;
         return {
             ...state,
             editingState: {
                 ...state.editingState,
                 items: newItems,
             },
         };

    default:
      return state;
  }
}