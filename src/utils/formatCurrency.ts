export const formatCurrency = (value: number, currency = 'KES') => {
  const label = currency === 'KES' || currency === 'KSh' ? 'KSh' : currency;
  return `${label} ${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};
