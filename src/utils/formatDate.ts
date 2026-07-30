export const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
};
