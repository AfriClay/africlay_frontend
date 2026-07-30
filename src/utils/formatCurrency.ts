export const formatCurrency = (value: number) => {
  return `KSh ${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};
