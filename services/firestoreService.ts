
import { db } from './firebase.ts';
import { doc, getDoc, setDoc, updateDoc, deleteField, runTransaction, collection, deleteDoc } from "firebase/firestore";
import type { UserProfile, DailyLog, ChatMessage, MealType, Meal } from '../types.ts';

const USER_COLLECTION = 'users';
const DIARY_SUBCOLLECTION = 'diaries';


// Helper para tratar erros do Firestore e fornecer feedback mais claro
const handleFirestoreError = (error: unknown, uid: string, context: string): Error => {
    console.error(`Erro no Firestore (${context}) para o usuário ${uid}:`, error);

    if (typeof error === 'object' && error !== null && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode === 'permission-denied' || errorCode === 'unauthenticated') {
            return new Error(
                `Permissão negada. Verifique suas Regras de Segurança do Firestore. ` +
                `Certifique-se de que um usuário autenticado pode ler/escrever em '${USER_COLLECTION}/${uid}'. ` +
                `Contexto: ${context}.`
            );
        }
    }

    return new Error(`Não foi possível ${context}.`);
};


/**
 * Busca o documento de um usuário. Se não existir, cria um com estrutura padrão.
 * Esta função é o ponto central para garantir que um usuário sempre tenha um documento ("arquivo pai") associado.
 * @param uid O ID do usuário do Firebase.
 * @returns Os dados do usuário, recém-criados ou existentes.
 */
const getOrCreateUserDoc = async (uid: string) => {
    if (!uid) {
        console.error("Tentativa de getOrCreateUserDoc com UID nulo.");
        throw new Error("UID do usuário é inválido.");
    }
    const docRef = doc(db, USER_COLLECTION, uid);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Documento não existe, cria um novo com a estrutura base.
            console.log(`Criando documento padrão para o novo usuário: ${uid}`);
            const defaultUserData = {
                profile: {},
                // Os diários agora são uma subcoleção, então o mapa 'diaries' não é mais necessário aqui.
                chatHistory: [],
            };
            await setDoc(docRef, defaultUserData);
            return defaultUserData;
        }
    } catch (error) {
        throw handleFirestoreError(error, uid, "acessar ou criar os dados do usuário");
    }
};

/**
 * Busca o perfil de um usuário no Firestore. Garante a criação do documento do usuário se não existir.
 * @param uid O ID do usuário do Firebase.
 * @returns O perfil do usuário (pode ser um objeto vazio).
 */
export const getUserProfile = async (uid: string): Promise<UserProfile> => {
    try {
        const userDoc = await getOrCreateUserDoc(uid);
        return userDoc.profile || {};
    } catch (error) {
        throw handleFirestoreError(error, uid, "carregar os dados do perfil");
    }
};

/**
 * Cria ou atualiza o perfil de um usuário no Firestore.
 * Lida com a exclusão de campos que são limpos na UI.
 * @param uid O ID do usuário do Firebase.
 * @param profileData Os dados do perfil a serem salvos.
 */
export const updateUserProfile = async (uid: string, profileData: UserProfile): Promise<void> => {
    try {
        const docRef = doc(db, USER_COLLECTION, uid);

        const updatePayload: { [key: string]: any } = {};
        Object.keys(profileData).forEach(key => {
            const value = profileData[key as keyof UserProfile];
            const fieldPath = `profile.${key}`;
            updatePayload[fieldPath] = value === undefined ? deleteField() : value;
        });
        
        await getOrCreateUserDoc(uid);

        if (Object.keys(updatePayload).length > 0) {
            await updateDoc(docRef, updatePayload);
        }
    } catch (error) {
        throw handleFirestoreError(error, uid, "salvar os dados do perfil");
    }
};


/**
 * Busca o diário de um dia específico para um usuário de uma subcoleção.
 * @param uid O ID do usuário.
 * @param dateKey A data no formato YYYY-MM-DD, que é o ID do documento na subcoleção.
 * @returns O diário do dia ou um objeto vazio se não existir.
 */
export const getDiaryLog = async (uid: string, dateKey: string): Promise<DailyLog> => {
    try {
        // O caminho agora aponta para um documento específico dentro da subcoleção 'diaries'.
        const diaryDocRef = doc(db, USER_COLLECTION, uid, DIARY_SUBCOLLECTION, dateKey);
        const docSnap = await getDoc(diaryDocRef);
        if (docSnap.exists()) {
            // O documento do dia contém diretamente o objeto DailyLog.
            return docSnap.data() as DailyLog;
        }
        return {}; // Retorna um objeto vazio se o dia ainda não tiver registros.
    } catch (error) {
        throw handleFirestoreError(error, uid, `carregar o diário de ${dateKey}`);
    }
};

/**
 * Salva ou atualiza uma única refeição no diário de um dia específico usando subcoleção.
 * @param uid O ID do usuário.
 * @param dateKey A data no formato YYYY-MM-DD.
 * @param mealType O tipo da refeição.
 * @param meal O objeto da refeição a ser salvo.
 */
export const saveMeal = async (uid: string, dateKey: string, mealType: MealType, meal: Meal): Promise<void> => {
    try {
        // Cria uma referência para o documento do dia específico na subcoleção.
        const diaryDocRef = doc(db, USER_COLLECTION, uid, DIARY_SUBCOLLECTION, dateKey);
        // Usa setDoc com { merge: true } para criar ou atualizar o campo da refeição
        // sem sobrescrever as outras refeições do dia.
        await setDoc(diaryDocRef, {
            [mealType]: meal
        }, { merge: true });
    } catch (error) {
        throw handleFirestoreError(error, uid, `salvar a refeição ${mealType}`);
    }
};

/**
 * Exclui uma refeição do diário. Se for a última refeição do dia, o documento do dia inteiro é excluído.
 * @param uid O ID do usuário.
 * @param dateKey A data no formato YYYY-MM-DD.
 * @param mealType O tipo de refeição a ser excluído.
 */
export const deleteMealFromLog = async (uid: string, dateKey: string, mealType: MealType): Promise<void> => {
    const diaryDocRef = doc(db, USER_COLLECTION, uid, DIARY_SUBCOLLECTION, dateKey);
    try {
        await runTransaction(db, async (transaction) => {
            const diaryDoc = await transaction.get(diaryDocRef);

            if (!diaryDoc.exists()) {
                console.warn(`Tentativa de exclusão em um diário inexistente: ${dateKey} para o usuário ${uid}`);
                return;
            }

            const dailyLog = diaryDoc.data() as DailyLog;
            
            // Se a refeição não existir no log, não há nada a fazer.
            if (!dailyLog[mealType]) {
                return;
            }

            // Remove o campo da refeição do objeto.
            delete dailyLog[mealType];

            // Se o log do dia ficou vazio após a exclusão, remove o documento do dia inteiro.
            if (Object.keys(dailyLog).length === 0) {
                transaction.delete(diaryDocRef);
            } else {
                // Caso contrário, apenas atualiza o documento do dia sem o campo da refeição.
                transaction.set(diaryDocRef, dailyLog);
            }
        });
    } catch (error) {
        throw handleFirestoreError(error, uid, `excluir a refeição "${mealType}"`);
    }
};


/**
 * Busca o histórico de chat de um usuário.
 * @param uid O ID do usuário.
 * @returns Um array de mensagens do chat.
 */
export const getChatHistory = async (uid: string): Promise<ChatMessage[]> => {
    try {
        const userDoc = await getOrCreateUserDoc(uid);
        return userDoc.chatHistory || [];
    } catch (error) {
        throw handleFirestoreError(error, uid, "carregar o histórico do chat");
    }
};

/**
 * Salva o histórico de chat de um usuário.
 * @param uid O ID do usuário.
 * @param messages O array de mensagens do chat a ser salvo.
 */
export const saveChatHistory = async (uid: string, messages: ChatMessage[]): Promise<void> => {
    try {
        // A lógica do chat permanece no documento principal do usuário, pois geralmente
        // o histórico completo é necessário para o contexto da IA.
        const docRef = doc(db, USER_COLLECTION, uid);
        await setDoc(docRef, { chatHistory: messages }, { merge: true });
    } catch (error) {
        throw handleFirestoreError(error, uid, "salvar a conversa");
    }
};

/**
 * Limpa o histórico de chat de um usuário, definindo-o como um array vazio.
 * @param uid O ID do usuário.
 */
export const deleteChatHistory = async (uid: string): Promise<void> => {
    try {
        const docRef = doc(db, USER_COLLECTION, uid);
        // Esta é a abordagem mais robusta para limpar a conversa. `setDoc` com `merge: true`
        // garante que o campo `chatHistory` seja explicitamente definido como um array vazio,
        // sobrescrevendo qualquer valor existente sem afetar outros campos como `profile`.
        // É mais à prova de falhas do que `updateDoc` com `deleteField`, especialmente
        // em cenários com regras de segurança complexas ou estados de documento inconsistentes.
        await setDoc(docRef, { chatHistory: [] }, { merge: true });
    } catch (error) {
        throw handleFirestoreError(error, uid, "limpar o histórico de conversa");
    }
};