
export const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const getDisplayDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const comparisonDate = new Date(date);
    comparisonDate.setHours(0, 0, 0, 0);

    if (comparisonDate.getTime() === today.getTime()) {
        return 'Hoje';
    }
    if (comparisonDate.getTime() === yesterday.getTime()) {
        return 'Ontem';
    }

    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
};