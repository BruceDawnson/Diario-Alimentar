


import React, { useState, useMemo, useCallback, useEffect, useRef, useReducer } from 'react';
import { analyzeMeal as analyzeMealService, analyzeSingleFoodItem, generateMealFeedback, ai } from './services/geminiService.ts';
import { formatDateKey, getDisplayDate } from './utils/dateUtils.ts';
import type { DiaryLogs, DailyLog, Meal, FoodItem, User, ChatMessage, UserProfile } from './types.ts';
import { MEAL_TYPES_ORDER, MealType } from './types.ts';
import { Remarkable } from 'remarkable';
import { auth } from './services/firebase.ts';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "firebase/auth";
import { 
    getUserProfile, 
    updateUserProfile,
    getDiaryLog,
    saveMeal,
    deleteMealFromLog,
    getChatHistory,
    saveChatHistory,
    deleteChatHistory,
} from './services/firestoreService.ts';
import type { Chat } from '@google/genai';
import { diaryReducer, initialDiaryState } from './diaryReducer.ts';


const md = new Remarkable();

// region ===== ICONS =====
const LeafIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M4.5 12a7.5 7.5 0 0 1 7.5-7.5s.262.003.787.029c.473.024.942.067 1.385.138a.75.75 0 0 1 .6.919c-.274.68-.022 1.48.558 1.954.48.395.734.999.596 1.583a7.502 7.502 0 0 1-13.425 0Z" clipRule="evenodd" /><path d="M12 1.5a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM12 12.375a.75.75 0 0 1 .75.75v4.125a.75.75 0 0 1-1.5 0V13.125a.75.75 0 0 1 .75-.75ZM18.75 12a.75.75 0 0 1 .75.75v.19l-1.5.001v-.19a.75.75 0 0 1 .75-.75ZM21.75 16.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" /></svg>);
const PlusIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>);
const ChevronLeftIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>);
const ChevronRightIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>);
const SunIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.909-2.636l1.591-1.591M5.25 12H3m4.227-4.909l-1.591-1.591M12 12a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" /></svg>);
const MoonIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25c0 5.385 4.365 9.75 9.75 9.75 2.572 0 4.92-.99 6.697-2.648z" /></svg>);
const BookOpenIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>);
const CalculatorIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm3-6h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm3-6h.008v.008H14.25v-.008zm0 3h.008v.008H14.25v-.008zM4.5 21V5.25A2.25 2.25 0 016.75 3h10.5a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25z" /></svg>);
const SparklesIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22l-.648-1.437a3.375 3.375 0 00-2.456-2.456L12 17.25l1.437-.648a3.375 3.375 0 002.456-2.456L16.25 13l.648 1.437a3.375 3.375 0 002.456 2.456L20.75 18l-1.437.648a3.375 3.375 0 00-2.456 2.456z" /></svg>);
const UserCircleIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const SpinnerIcon = ({ className = "h-5 w-5" }) => (<svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const SendIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>);
const LogoutIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>);
const EllipsisVerticalIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>);
const PencilIcon = ({ className = "h-5 w-5" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>);
const TrashIcon = ({ className = "h-5 w-5" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 4.811 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.033-2.124H8.033c-1.12 0-2.033.944-2.033 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>);
const LightBulbIcon = ({ className = "h-5 w-5" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311l.738-1.026a.75.75 0 011.262.39M12 6.75A2.25 2.25 0 009.75 9v.034a7.5 7.5 0 015.512 4.418l-2.06 1.712a7.5 7.5 0 00-5.512-4.418V9A2.25 2.25 0 0012 6.75z" /></svg>);
const CheckCircleIcon = ({ className = "h-5 w-5" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const ExclamationCircleIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>);

// endregion

// region ===== HOOKS & CONTEXT =====
const ToastContext = React.createContext<{ showToast: (message: string, type: 'success' | 'error') => void; } | null>(null);

const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast deve ser usado dentro de um ToastProvider");
    }
    return context;
};

const useTheme = () => {
    const [theme, setTheme] = useState(() => {
        if (typeof localStorage !== 'undefined' && localStorage.theme) {
            return localStorage.theme;
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    return { theme, toggleTheme };
};
// endregion

// region ===== COMPONENTS =====
const Header = ({ onToggleTheme, theme, onLogout }) => (
    <header className="flex justify-between items-center p-2 sm:p-4 border-b border-base-400 dark:border-dark-base-400 bg-base-100 dark:bg-dark-base-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <LeafIcon className="h-8 w-8 text-primary dark:text-dark-primary" />
            <h1 className="text-xl font-bold">Diário de Alimentação</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onToggleTheme} className="p-2 rounded-full hover:bg-base-300 dark:hover:bg-dark-base-300 transition-colors" aria-label="Alterar tema">
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button onClick={onLogout} className="p-2 rounded-full hover:bg-base-300 dark:hover:bg-dark-base-300 transition-colors" aria-label="Sair">
                <LogoutIcon />
            </button>
        </div>
    </header>
);

const Nav = ({ activePage, onPageChange }) => {
    const navItems = [
        { id: 'diary', icon: BookOpenIcon, label: 'Diário' },
        { id: 'imc', icon: CalculatorIcon, label: 'IMC' },
        { id: 'assistant', icon: SparklesIcon, label: 'Assistente' },
        { id: 'profile', icon: UserCircleIcon, label: 'Perfil' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-base-100 dark:bg-dark-base-200 border-t border-base-300 dark:border-dark-base-300 flex justify-around shadow-t-lg z-10">
            {navItems.map(({ id, icon: Icon, label }) => {
                const isActive = activePage === id;
                return (
                    <button
                        key={id}
                        onClick={() => onPageChange(id)}
                        className={`flex flex-col items-center justify-center p-3 w-full text-xs font-medium transition-all duration-300 relative ${isActive ? 'text-primary dark:text-dark-primary' : 'text-gray-500 hover:text-primary dark:hover:text-dark-primary'}`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <Icon className="h-6 w-6 mb-1" />
                        <span>{label}</span>
                         {isActive && <div className="absolute bottom-1 h-1 w-8 bg-primary dark:bg-dark-primary rounded-full" />}
                    </button>
                );
            })}
        </nav>
    );
};

const CalorieSummary = ({ logs }: { logs: DailyLog }) => {
    const totalCalories = useMemo(() => {
        return Object.values(logs).reduce((total, meal) => {
            return total + (meal?.totalCalories || 0);
        }, 0);
    }, [logs]);

    return (
        <div className="p-4 sm:p-6 bg-base-100 dark:bg-dark-base-200 rounded-xl shadow-sm text-center">
            <p className="text-base text-gray-600 dark:text-gray-400">Total de Calorias Hoje</p>
            <p className="text-4xl sm:text-5xl font-extrabold text-primary dark:text-dark-primary mt-1">{totalCalories.toLocaleString('pt-BR')}</p>
        </div>
    );
};


// NOVO: Componente para o formulário de adicionar um único item
const AddFoodItemForm = ({ onAddItem, isLoading }) => {
    const [newItemDesc, setNewItemDesc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemDesc.trim()) return;
        onAddItem(newItemDesc);
        setNewItemDesc('');
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
            <input
                type="text"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                placeholder="Ex: 2 ovos mexidos"
                className="flex-grow p-2 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition"
                disabled={isLoading}
                required
            />
            <button
                type="submit"
                disabled={isLoading || !newItemDesc.trim()}
                className="flex items-center justify-center gap-2 bg-primary dark:bg-dark-primary text-primary-content dark:text-dark-primary-content p-2 rounded-lg font-semibold hover:bg-primary-focus dark:hover:bg-dark-primary-focus focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus disabled:opacity-50 transition-all"
            >
                {isLoading ? <SpinnerIcon className="h-6 w-6" /> : <PlusIcon className="h-6 w-6" />}
            </button>
        </form>
    );
};

interface MealCardProps {
    mealType: MealType;
    meal: Meal | undefined;
    isEditing: boolean;
    editingItems: FoodItem[];
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onAddItem: (item: FoodItem) => void;
    onUpdateItem: (index: number, item: FoodItem) => void;
    onRemoveItem: (index: number) => void;
    onSave: () => Promise<void>;
    onDelete: () => Promise<void>;
    className?: string;
    style?: React.CSSProperties;
}

const MealCard: React.FC<MealCardProps> = ({
    mealType,
    meal,
    isEditing,
    editingItems,
    isLoading,
    isSubmitting,
    error,
    onStartEdit,
    onCancelEdit,
    onAddItem,
    onUpdateItem,
    onRemoveItem,
    onSave,
    onDelete,
    className = "",
    style = {},
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();
    
    const editingTotalCalories = useMemo(() => editingItems.reduce((sum, item) => sum + item.calories, 0), [editingItems]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleDeleteMeal = () => {
         if (window.confirm(`Tem certeza de que deseja excluir o ${mealType}? Esta ação não pode ser desfeita.`)) {
            onDelete();
         }
         setIsMenuOpen(false);
    }
    
    const handleEditMeal = () => {
        onStartEdit();
        setIsMenuOpen(false);
    }
    
    const handleAddItem = async (description: string) => {
        setIsAddingItem(true);
        try {
            const newItem = await analyzeSingleFoodItem(description);
            onAddItem(newItem);
        } catch (e) {
            console.error("Erro ao adicionar item", e);
            showToast("Falha ao analisar o item.", "error");
        } finally {
            setIsAddingItem(false);
        }
    };

    return (
        <div style={style} className={`bg-base-100 dark:bg-dark-base-200 p-3 sm:p-4 rounded-xl shadow-sm ${className}`}>
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold">{mealType}</h3>
                 {meal && !isEditing && (
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 rounded-full text-gray-500 hover:bg-base-300 dark:hover:bg-dark-base-300" disabled={isLoading} aria-label="Opções da refeição">
                            <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-base-100 dark:bg-dark-base-200 rounded-lg shadow-xl z-10 border border-base-300 dark:border-dark-base-400">
                                <button onClick={handleEditMeal} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-base-200 dark:hover:bg-dark-base-300 flex items-center gap-2 rounded-t-lg">
                                    <PencilIcon /> Editar
                                </button>
                                <button onClick={handleDeleteMeal} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg">
                                    <TrashIcon /> Excluir
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
             {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
             
            {isSubmitting ? (
                <div className="flex justify-center items-center py-10">
                    <SpinnerIcon className="h-8 w-8 text-primary" />
                </div>
            ) : !isEditing && meal ? (
                <div className="space-y-4">
                    <ul className="space-y-2">
                        {meal.items.map((item, index) => (
                            <li key={index} className="flex justify-between items-center text-sm border-b border-base-300 dark:border-dark-base-300 py-1">
                                <span>{item.name}</span>
                                <span className="font-semibold">{item.calories} kcal</span>
                            </li>
                        ))}
                    </ul>
                     <div className="space-y-3 pt-3">
                        <h4 className="font-semibold text-base text-gray-800 dark:text-gray-200">{meal.feedback.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{meal.feedback.analysis}</p>
                        <div className="flex items-start gap-2 p-3 bg-primary/10 dark:bg-dark-primary/10 rounded-lg">
                            <LightBulbIcon className="h-5 w-5 text-primary dark:text-dark-primary flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium text-primary dark:text-dark-primary">{meal.feedback.suggestion}</p>
                        </div>
                    </div>
                    <p className="text-right font-bold text-lg mt-2">Total: {meal.totalCalories} kcal</p>
                </div>
            ) : isEditing ? (
                 <>
                    <div className="space-y-3">
                        {editingItems.length > 0 && (
                            <ul className="space-y-2">
                                {editingItems.map((item, index) => (
                                    <li key={index} className="flex justify-between items-center text-sm border-b border-base-300 dark:border-dark-base-300 py-1.5 group">
                                        <span>{item.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold">{item.calories} kcal</span>
                                            <button onClick={() => onRemoveItem(index)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <AddFoodItemForm onAddItem={handleAddItem} isLoading={isAddingItem} />

                        <p className="text-right font-bold text-base mt-2">Total Provisório: {editingTotalCalories} kcal</p>
                        <div className="flex items-center gap-2 pt-3">
                            <button type="button" onClick={onCancelEdit} className="w-full bg-secondary dark:bg-dark-secondary text-secondary-content dark:text-dark-secondary-content py-2.5 px-4 rounded-lg font-semibold hover:bg-secondary-focus dark:hover:bg-dark-secondary-focus transition-all">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={isSubmitting}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-all ${
                                    editingItems.length === 0
                                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                                    : 'bg-primary dark:bg-dark-primary text-primary-content dark:text-dark-primary-content hover:bg-primary-focus dark:hover:bg-dark-primary-focus focus:ring-primary-focus'
                                }`}
                            >
                                {isSubmitting ? (
                                    <><SpinnerIcon /> Salvando...</>
                                ) : editingItems.length === 0 ? (
                                    <><TrashIcon /> Excluir Refeição</>
                                ) : (
                                    <><CheckCircleIcon /> Salvar Refeição</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                 <button onClick={onStartEdit} className="w-full flex items-center justify-center gap-2 text-primary dark:text-dark-primary py-2.5 px-4 rounded-lg font-semibold border-2 border-dashed border-primary/50 dark:border-dark-primary/50 hover:bg-primary/10 dark:hover:bg-dark-primary/10 transition-colors">
                    <PlusIcon className="h-5 w-5" /> Adicionar {mealType}
                </button>
            )}
        </div>
    );
};


const DiaryPage = ({ user }: { user: User }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [state, dispatch] = useReducer(diaryReducer, initialDiaryState);
    const { dailyLog, isLoading, isSubmitting, error, editingState } = state;
    const { showToast } = useToast();

    const dateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);
    
    const isFutureDate = useMemo(() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return currentDate > today;
    }, [currentDate]);

    const fetchLog = useCallback(async () => {
        dispatch({ type: 'FETCH_START' });
        try {
            const log = await getDiaryLog(user.uid, dateKey);
            dispatch({ type: 'FETCH_SUCCESS', payload: log });
        } catch (e) {
            console.error("Erro ao buscar diário:", e);
            const errorMessage = e instanceof Error ? e.message : "Não foi possível carregar os dados.";
            showToast(errorMessage, "error");
            dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
        }
    }, [user.uid, dateKey, showToast]);

    useEffect(() => {
        fetchLog();
    }, [fetchLog]);

    const changeDate = (amount: number) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + amount);
            return newDate;
        });
    };
    
    const handleStartEdit = (mealType: MealType) => {
        dispatch({
            type: 'START_EDIT',
            payload: {
                mealType,
                items: dailyLog[mealType]?.items || [],
            }
        });
    };
    
    const handleCancelEdit = () => {
        dispatch({ type: 'CANCEL_EDIT' });
    };

    const handleAddItem = (item: FoodItem) => {
        dispatch({ type: 'ADD_ITEM', payload: item });
    };

    const handleRemoveItem = (index: number) => {
        dispatch({ type: 'REMOVE_ITEM', payload: index });
    };

    const handleUpdateItem = (index: number, item: FoodItem) => {
        dispatch({ type: 'UPDATE_ITEM', payload: { index, item } });
    };
    
    const handleSaveMeal = async () => {
        if (!editingState) return;

        const { mealType, items } = editingState;
        
        if (items.length === 0) {
            await handleDeleteMeal(mealType);
            return;
        }

        dispatch({ type: 'SUBMIT_START', payload: mealType });

        try {
            const fullDescription = items.map(i => i.name).join(', ');
            const feedback = await generateMealFeedback(fullDescription);
            const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);

            const newMeal: Meal = {
                description: fullDescription,
                items,
                feedback,
                totalCalories,
            };

            await saveMeal(user.uid, dateKey, mealType, newMeal);
            dispatch({ type: 'SAVE_SUCCESS', payload: { mealType, meal: newMeal } });
            showToast(`${mealType} salvo com sucesso!`, 'success');

        } catch (e) {
            console.error(`Erro ao salvar ${mealType}:`, e);
            const errorMessage = e instanceof Error ? e.message : 'Falha ao salvar a refeição.';
            showToast(errorMessage, 'error');
            dispatch({ type: 'SUBMIT_ERROR', payload: { mealType, message: errorMessage } });
        }
    };

    const handleDeleteMeal = async (mealType: MealType) => {
        dispatch({ type: 'SUBMIT_START', payload: mealType });
        try {
            await deleteMealFromLog(user.uid, dateKey, mealType);
            dispatch({ type: 'DELETE_SUCCESS', payload: { mealType } });
            showToast(`${mealType} excluído com sucesso.`, 'success');
        } catch (e) {
            console.error(`Erro ao excluir ${mealType}:`, e);
            const errorMessage = e instanceof Error ? e.message : 'Falha ao excluir a refeição.';
            showToast(errorMessage, 'error');
            dispatch({ type: 'SUBMIT_ERROR', payload: { mealType, message: errorMessage } });
        }
    };
    
    return (
        <div className="space-y-4">
            <header className="flex items-center justify-between p-2 bg-base-100 dark:bg-dark-base-200 rounded-xl shadow-sm">
                <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-base-300 dark:hover:bg-dark-base-300 transition-colors" aria-label="Dia anterior">
                    <ChevronLeftIcon />
                </button>
                <h2 className="text-lg font-bold text-center">{getDisplayDate(currentDate)}</h2>
                <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-base-300 dark:hover:bg-dark-base-300 transition-colors" aria-label="Próximo dia">
                    <ChevronRightIcon />
                </button>
            </header>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <SpinnerIcon className="h-10 w-10 text-primary" />
                </div>
            ) : error && !error.mealType ? (
                 <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-center">
                    <p><strong>Erro:</strong> {error.message}</p>
                </div>
            ) : isFutureDate ? (
                <div className="p-6 bg-base-100 dark:bg-dark-base-200 rounded-xl shadow-sm text-center">
                    <p className="text-gray-600 dark:text-gray-400">Não é possível adicionar refeições em datas futuras.</p>
                </div>
            ) : (
                <>
                    <CalorieSummary logs={dailyLog} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MEAL_TYPES_ORDER.map((mealType, index) => {
                             const isEditingThis = editingState?.mealType === mealType;
                             const isSubmittingThis = isSubmitting === mealType;
                             const errorForThis = error?.mealType === mealType ? error.message : null;
                             
                             return (
                                <MealCard
                                    key={mealType}
                                    mealType={mealType}
                                    meal={dailyLog[mealType]}
                                    isEditing={isEditingThis}
                                    editingItems={isEditingThis ? editingState.items : []}
                                    isLoading={isLoading}
                                    isSubmitting={isSubmittingThis}
                                    error={errorForThis}
                                    onStartEdit={() => handleStartEdit(mealType)}
                                    onCancelEdit={handleCancelEdit}
                                    onAddItem={handleAddItem}
                                    onUpdateItem={handleUpdateItem}
                                    onRemoveItem={handleRemoveItem}
                                    onSave={handleSaveMeal}
                                    onDelete={() => handleDeleteMeal(mealType)}
                                    className="animate-fade-in-up"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                />
                             )
                        })}
                    </div>
                </>
            )}
        </div>
    );
};


const IMCPage = ({ profile, onProfileUpdate }: { profile: UserProfile, onProfileUpdate: (newProfile: UserProfile) => void }) => {
    const [currentWeight, setCurrentWeight] = useState<number | string>(profile.currentWeight || '');
    const [height, setHeight] = useState<number | string>(profile.height || '');
    const { showToast } = useToast();

    const { imc, category, color } = useMemo(() => {
        const w = parseFloat(String(currentWeight));
        const h = parseFloat(String(height));

        if (w > 0 && h > 0) {
            const heightInMeters = h / 100;
            const imcValue = w / (heightInMeters * heightInMeters);
            let cat = '';
            let col = '';
            if (imcValue < 18.5) {
                cat = 'Abaixo do peso';
                col = 'text-blue-500';
            } else if (imcValue < 24.9) {
                cat = 'Peso normal';
                col = 'text-green-500';
            } else if (imcValue < 29.9) {
                cat = 'Sobrepeso';
                col = 'text-yellow-500';
            } else if (imcValue < 34.9) {
                cat = 'Obesidade Grau I';
                col = 'text-orange-500';
            } else if (imcValue < 39.9) {
                cat = 'Obesidade Grau II';
                col = 'text-red-500';
            } else {
                cat = 'Obesidade Grau III';
                col = 'text-red-700';
            }
            return { imc: imcValue.toFixed(2), category: cat, color: col };
        }
        return { imc: null, category: null, color: null };
    }, [currentWeight, height]);
    
    const handleSave = async () => {
        try {
            const newProfile: UserProfile = {
                ...profile,
                currentWeight: currentWeight ? parseFloat(String(currentWeight)) : undefined,
                height: height ? parseInt(String(height), 10) : undefined
            }
            await onProfileUpdate(newProfile);
            showToast("Dados salvos com sucesso!", "success");
        } catch (error) {
            showToast("Erro ao salvar os dados.", "error");
        }
    };

    return (
        <div className="space-y-4">
             <div className="p-4 bg-base-100 dark:bg-dark-base-200 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">Calculadora de IMC</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="weight" className="block text-sm font-medium mb-1">Peso Atual (kg)</label>
                        <input
                            type="number"
                            id="weight"
                            value={currentWeight}
                            onChange={(e) => setCurrentWeight(e.target.value)}
                            placeholder="Ex: 70.5"
                            className="w-full p-2 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition"
                        />
                    </div>
                    <div>
                        <label htmlFor="height" className="block text-sm font-medium mb-1">Altura (cm)</label>
                        <input
                            type="number"
                            id="height"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="Ex: 175"
                             className="w-full p-2 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition"
                        />
                    </div>
                </div>
                <button onClick={handleSave} className="mt-4 w-full bg-primary dark:bg-dark-primary text-primary-content dark:text-dark-primary-content py-2.5 px-4 rounded-lg font-semibold hover:bg-primary-focus dark:hover:bg-dark-primary-focus transition-all">
                    Salvar Dados
                </button>
            </div>

            {imc && (
                <div className="p-6 bg-base-100 dark:bg-dark-base-200 rounded-xl shadow-sm text-center animate-fade-in-up">
                    <p className="text-lg text-gray-600 dark:text-gray-400">Seu IMC é</p>
                    <p className={`text-6xl font-extrabold my-2 ${color}`}>{imc}</p>
                    <p className={`text-xl font-bold ${color}`}>{category}</p>
                </div>
            )}
        </div>
    );
};

const AssistantPage = ({ user }: { user: User }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            try {
                const history = await getChatHistory(user.uid);
                setMessages(history);
                const newChat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    history: history.map(msg => ({
                        role: msg.role,
                        // FIX: The 'parts' property must be an array of Part objects.
                        parts: [{ text: msg.text }]
                    })),
                     config: {
                         systemInstruction: "Você é um assistente de nutrição amigável e motivacional. Suas respostas devem ser concisas, informativas e sempre encorajadoras. Use markdown para formatar listas e negrito quando apropriado. Fale em Português do Brasil.",
                     },
                });
                setChat(newChat);
            } catch (error) {
                showToast("Erro ao carregar o histórico do chat.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [user.uid, showToast]);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (text: string) => {
        if (!chat || !text.trim()) return;

        const userMessage: ChatMessage = { role: 'user', text };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const result = await chat.sendMessage({ message: text });
            const modelMessage: ChatMessage = { role: 'model', text: result.text };
            
            const updatedMessages = [...messages, userMessage, modelMessage];
            setMessages(updatedMessages);
            await saveChatHistory(user.uid, updatedMessages);
        } catch (error) {
            showToast("O assistente não pôde responder. Tente novamente.", "error");
            setMessages(prev => prev.slice(0, -1)); // Remove user message on error
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClearHistory = async () => {
        if (window.confirm("Tem certeza que deseja limpar o histórico da conversa?")) {
            try {
                await deleteChatHistory(user.uid);
                setMessages([]);
                const newChat = ai.chats.create({ model: 'gemini-2.5-flash' });
                setChat(newChat);
                showToast("Histórico limpo.", "success");
            } catch (error) {
                showToast("Falha ao limpar o histórico.", "error");
            }
        }
    };


    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-base-100 dark:bg-dark-base-200 rounded-t-xl shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-base-300 dark:border-dark-base-300">
                <h2 className="text-xl font-bold">Assistente IA</h2>
                <button onClick={handleClearHistory} className="text-sm text-secondary hover:text-red-500 transition-colors">
                    Limpar Histórico
                </button>
            </div>
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-2xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary dark:bg-dark-primary text-primary-content dark:text-dark-primary-content rounded-br-none' : 'bg-base-300 dark:bg-dark-base-300 rounded-bl-none'}`}>
                            <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: md.render(msg.text) }} />
                        </div>
                    </div>
                ))}
                {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
                     <div className="flex justify-start">
                        <div className="max-w-xs p-3 rounded-2xl bg-base-300 dark:bg-dark-base-300 rounded-bl-none">
                           <SpinnerIcon className="h-5 w-5" />
                        </div>
                    </div>
                )}
            </div>
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
    );
};

const ChatInput = ({ onSendMessage, isLoading }) => {
    const [text, setText] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSendMessage(text);
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border-t border-base-300 dark:border-dark-base-300">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Pergunte algo ao assistente..."
                    className="w-full p-3 border rounded-full bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !text.trim()} className="bg-primary text-primary-content rounded-full p-3 hover:bg-primary-focus disabled:opacity-50 transition-colors">
                    <SendIcon />
                </button>
            </div>
        </form>
    );
};

const ProfilePage = ({ user, onProfileUpdate }: { user: User, onProfileUpdate: (newProfile: UserProfile) => Promise<void> }) => {
    const [profile, setProfile] = useState<UserProfile>(user.profile || {});
    const { showToast } = useToast();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value ? Number(value) : undefined }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onProfileUpdate(profile);
            showToast("Perfil atualizado com sucesso!", "success");
        } catch (error) {
             const message = error instanceof Error ? error.message : "Não foi possível salvar o perfil."
             showToast(message, "error");
        }
    };

    return (
        <div className="p-4 bg-base-100 dark:bg-dark-base-200 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Meu Perfil</h2>
            <div className="mb-4">
                <p><strong>Nome:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="initialWeight" className="block text-sm font-medium mb-1">Peso Inicial (kg)</label>
                        <input type="number" name="initialWeight" id="initialWeight" value={profile.initialWeight || ''} onChange={handleChange} placeholder="Ex: 80" className="w-full p-2 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition" />
                    </div>
                     <div>
                        <label htmlFor="targetWeight" className="block text-sm font-medium mb-1">Peso Alvo (kg)</label>
                        <input type="number" name="targetWeight" id="targetWeight" value={profile.targetWeight || ''} onChange={handleChange} placeholder="Ex: 70" className="w-full p-2 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition" />
                    </div>
                </div>
                 <div>
                    <button type="submit" className="w-full bg-primary dark:bg-dark-primary text-primary-content dark:text-dark-primary-content py-2.5 px-4 rounded-lg font-semibold hover:bg-primary-focus dark:hover:bg-dark-primary-focus transition-all">
                        Salvar Perfil
                    </button>
                </div>
            </form>
        </div>
    );
};

const Toast = ({ message, type, onDismiss }) => {
    const isSuccess = type === 'success';
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className={`fixed top-5 right-5 flex items-center p-4 rounded-lg shadow-lg text-white ${isSuccess ? 'bg-green-500' : 'bg-red-500'} animate-fade-in-up z-50`}>
            {isSuccess ? <CheckCircleIcon className="h-6 w-6 mr-2" /> : <ExclamationCircleIcon className="h-6 w-6 mr-2" />}
            <span>{message}</span>
        </div>
    );
};

const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });
    const dismissToast = () => setToast(null);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
        </ToastContext.Provider>
    );
};

const AuthPage = ({ onAuthSuccess }) => {
    const [currentView, setCurrentView] = useState('login'); // 'login', 'signup', 'forgotPassword'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { showToast } = useToast();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            onAuthSuccess();
        } catch (error) {
            setError(error.message.includes('auth/invalid-credential') ? 'Email ou senha inválidos.' : 'Ocorreu um erro ao fazer login.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSignup = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Salva o nome do usuário. Em um app real, isso seria feito no Firestore.
            // Por simplicidade, assumimos que o onAuthStateChanged cuidará do resto.
            // Aqui, apenas chamamos onAuthSuccess, que acionará o recarregamento do usuário.
            showToast("Conta criada com sucesso! Faça login.", "success");
            setCurrentView('login');
        } catch (error) {
            setError(error.message.includes('auth/email-already-in-use') ? 'Este email já está em uso.' : 'Ocorreu um erro ao criar a conta.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await sendPasswordResetEmail(auth, email);
            showToast("Email de recuperação enviado! Verifique sua caixa de entrada.", "success");
            setCurrentView('login');
        } catch (error) {
            setError('Não foi possível enviar o email de recuperação. Verifique o endereço digitado.');
        } finally {
            setIsLoading(false);
        }
    };


    const renderForm = () => {
        switch (currentView) {
            case 'signup':
                return (
                    <>
                        <h2 className="text-3xl font-bold text-center mb-2">Crie sua conta</h2>
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Comece a registrar suas refeições hoje!</p>
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div>
                                <label className="block font-medium mb-1">Nome</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-3 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Senha</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition" />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-primary text-primary-content p-3 rounded-lg font-semibold hover:bg-primary-focus disabled:opacity-50 transition-colors">
                                {isLoading ? <SpinnerIcon /> : 'Cadastrar'}
                            </button>
                        </form>
                        <p className="text-center mt-4">
                            Já tem uma conta?{' '}
                            <button onClick={() => setCurrentView('login')} className="text-primary font-semibold hover:underline">
                                Entre aqui
                            </button>
                        </p>
                    </>
                );
            case 'forgotPassword':
                 return (
                    <>
                        <h2 className="text-3xl font-bold text-center mb-2">Recuperar Senha</h2>
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Insira seu email para receber o link de recuperação.</p>
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div>
                                <label className="block font-medium mb-1">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition" />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-primary text-primary-content p-3 rounded-lg font-semibold hover:bg-primary-focus disabled:opacity-50 transition-colors">
                                {isLoading ? <SpinnerIcon /> : 'Enviar Email'}
                            </button>
                        </form>
                        <p className="text-center mt-4">
                            Lembrou a senha?{' '}
                            <button onClick={() => setCurrentView('login')} className="text-primary font-semibold hover:underline">
                                Voltar para o Login
                            </button>
                        </p>
                    </>
                );
            case 'login':
            default:
                return (
                    <>
                        <h2 className="text-3xl font-bold text-center mb-2">Bem-vindo(a) de volta!</h2>
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Faça login para continuar.</p>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block font-medium mb-1">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition" />
                            </div>
                            <div>
                                 <div className="flex justify-between items-baseline">
                                    <label className="block font-medium mb-1">Senha</label>
                                    <button type="button" onClick={() => setCurrentView('forgotPassword')} className="text-sm text-primary font-semibold hover:underline">
                                        Esqueceu?
                                    </button>
                                </div>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 border rounded-lg bg-base-200 dark:bg-dark-base-100 border-base-400 dark:border-dark-base-400 focus:ring-2 focus:ring-primary focus:border-primary transition" />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-primary text-primary-content p-3 rounded-lg font-semibold hover:bg-primary-focus disabled:opacity-50 transition-colors">
                                {isLoading ? <SpinnerIcon /> : 'Entrar'}
                            </button>
                        </form>
                        <p className="text-center mt-4">
                            Não tem uma conta?{' '}
                            <button onClick={() => setCurrentView('signup')} className="text-primary font-semibold hover:underline">
                                Cadastre-se
                            </button>
                        </p>
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 dark:bg-dark-base-100 p-4">
            <div className="w-full max-w-md bg-base-100 dark:bg-dark-base-200 p-8 rounded-2xl shadow-lg animate-fade-in-up">
                 <div className="flex flex-col items-center justify-center mb-8">
                    <LeafIcon className="h-12 w-12 text-primary dark:text-dark-primary" />
                    <h1 className="text-2xl font-bold mt-2">Diário de Alimentação</h1>
                </div>

                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">{error}</p>}
                {renderForm()}
            </div>
        </div>
    );
};


const App = () => {
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [activePage, setActivePage] = useState('diary');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                setUser({
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || 'Usuário',
                    email: firebaseUser.email || '',
                    profile
                });
            } else {
                setUser(null);
            }
            setIsLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);
    
    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        setActivePage('diary');
    };

    const handleProfileUpdate = async (newProfileData: UserProfile) => {
        if (!user) return;
        await updateUserProfile(user.uid, newProfileData);
        // Atualiza o estado local do usuário para refletir as mudanças imediatamente
        setUser(prevUser => prevUser ? ({ ...prevUser, profile: newProfileData }) : null);
    };
    
    const handleAuthSuccess = () => {
        // O onAuthStateChanged vai lidar com a atualização do usuário.
        // Apenas garantimos que o spinner de loading seja desativado.
        setIsLoadingAuth(false);
    }
    
    const renderPage = () => {
        if (!user) return null;
        switch (activePage) {
            case 'diary':
                return <DiaryPage user={user} />;
            case 'imc':
                return <IMCPage profile={user.profile || {}} onProfileUpdate={handleProfileUpdate} />;
            case 'assistant':
                return <AssistantPage user={user} />;
            case 'profile':
                return <ProfilePage user={user} onProfileUpdate={handleProfileUpdate} />;
            default:
                return <DiaryPage user={user} />;
        }
    };

    if (isLoadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <SpinnerIcon className="h-12 w-12 text-primary" />
            </div>
        );
    }

    return (
        <ToastProvider>
            {!user ? (
                 <AuthPage onAuthSuccess={handleAuthSuccess} />
            ) : (
                <div className="min-h-screen">
                    <Header onToggleTheme={toggleTheme} theme={theme} onLogout={handleLogout} />
                    <main className="p-4 pb-24">
                        {renderPage()}
                    </main>
                    <Nav activePage={activePage} onPageChange={setActivePage} />
                </div>
            )}
        </ToastProvider>
    );
};

export default App;