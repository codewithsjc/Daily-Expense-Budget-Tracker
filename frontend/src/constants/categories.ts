export const EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'restaurant', color: '#ef4444' },
  { name: 'Travel', icon: 'flight', color: '#3b82f6' },
  { name: 'Rent', icon: 'home', color: '#8b5cf6' },
  { name: 'Shopping', icon: 'shopping-cart', color: '#f59e0b' },
  { name: 'Health', icon: 'local-hospital', color: '#10b981' },
  { name: 'Entertainment', icon: 'movie', color: '#ec4899' },
  { name: 'Utilities', icon: 'flash-on', color: '#06b6d4' },
  { name: 'Other', icon: 'more-horiz', color: '#6b7280' },
];

export const getCategoryColor = (categoryName: string): string => {
  const category = EXPENSE_CATEGORIES.find(c => c.name === categoryName);
  return category?.color || '#6b7280';
};

export const getCategoryIcon = (categoryName: string): string => {
  const category = EXPENSE_CATEGORIES.find(c => c.name === categoryName);
  return category?.icon || 'more-horiz';
};

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export const getCurrencySymbol = (code: string): string => {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.symbol || '$';
};
