export const mealBadgeClasses: Record<string, string> = {
    breakfast: 'bg-amber-100 text-amber-700',
    lunch: 'bg-green-100 text-green-700',
    dinner: 'bg-indigo-100 text-indigo-700',
    snacks: 'bg-pink-100 text-pink-700',
};

export const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
    morning_snacks: 'Morning Snacks',
    evening_snacks: 'Evening Snacks',
    hot_meal: 'Hot Meal',
};

export function formatMealType(type: string): string {
    return (
        mealLabels[type] ||
        type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

export function mealBadgeClass(type: string): string {
    return mealBadgeClasses[type] || 'bg-slate-100 text-slate-600';
}
