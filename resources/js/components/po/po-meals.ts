/**
 * Item types a PO line can have, in the order shown in the form's picker.
 */
export const poMealTypeOptions: { value: string; label: string }[] = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'morning_snacks', label: 'Morning Snacks' },
    { value: 'evening_snacks', label: 'Evening Snacks' },
    { value: 'hot_meal', label: 'Hot Meal' },
    { value: 'sweets', label: 'Sweets' },
    { value: 'dessert', label: 'Dessert' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'meat_seafood', label: 'Meat & Seafood' },
    { value: 'fish', label: 'Fish' },
    { value: 'frozen_item', label: 'Frozen Item' },
    { value: 'grocery_dry', label: 'Grocery & Dry Foods' },
    { value: 'meat_poultry', label: 'Meat & Poultry' },
    { value: 'fish_seafood', label: 'Fish & Seafood' },
    { value: 'vegetables_fruits', label: 'Vegetables & Fruits' },
    { value: 'dairy_eggs', label: 'Dairy & Eggs' },
    { value: 'spices_oil_condiments', label: 'Spices, Oil & Condiments' },
    { value: 'bakery_confectionery', label: 'Bakery & Confectionery' },
    { value: 'snacks_fast_food', label: 'Snacks & Fast Food' },
    { value: 'beverages_water', label: 'Beverages & Water' },
    { value: 'cooked_food_meals', label: 'Cooked Food & Meals' },
    { value: 'food_packages_catering', label: 'Food Packages & Catering' },
    { value: 'others', label: 'Others' },
];

const poMealLabels: Record<string, string> = {
    ...Object.fromEntries(
        poMealTypeOptions.map((option) => [option.value, option.label]),
    ),
    grocery: 'Grocery & Dry Foods',
};

const poMealBadgeClasses: Record<string, string> = {
    breakfast: 'bg-amber-100 text-amber-700',
    lunch: 'bg-green-100 text-green-700',
    dinner: 'bg-indigo-100 text-indigo-700',
    snacks: 'bg-pink-100 text-pink-700',
    morning_snacks: 'bg-orange-100 text-orange-700',
    evening_snacks: 'bg-violet-100 text-violet-700',
    hot_meal: 'bg-red-100 text-red-700',
    sweets: 'bg-yellow-100 text-yellow-700',
    dessert: 'bg-fuchsia-100 text-fuchsia-700',
    grocery: 'bg-emerald-100 text-emerald-700',
    meat_seafood: 'bg-rose-100 text-rose-700',
    fish: 'bg-cyan-100 text-cyan-700',
    frozen_item: 'bg-sky-100 text-sky-700',
    grocery_dry: 'bg-emerald-100 text-emerald-700',
    meat_poultry: 'bg-red-100 text-red-700',
    fish_seafood: 'bg-cyan-100 text-cyan-700',
    vegetables_fruits: 'bg-lime-100 text-lime-700',
    dairy_eggs: 'bg-blue-100 text-blue-700',
    spices_oil_condiments: 'bg-orange-100 text-orange-700',
    bakery_confectionery: 'bg-yellow-100 text-yellow-700',
    snacks_fast_food: 'bg-pink-100 text-pink-700',
    beverages_water: 'bg-teal-100 text-teal-700',
    cooked_food_meals: 'bg-amber-100 text-amber-700',
    food_packages_catering: 'bg-purple-100 text-purple-700',
    others: 'bg-slate-100 text-slate-600',
};

export function formatPoMealType(type: string): string {
    return (
        poMealLabels[type] ||
        type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

export function poMealBadgeClass(type: string): string {
    return poMealBadgeClasses[type] || 'bg-slate-100 text-slate-600';
}
