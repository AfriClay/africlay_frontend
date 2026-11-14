const DESKTOP_CARD_WIDTH = 116;

export const categoryGridColumns = (count: number, availableWidth: number): number => {
  if (count <= 0) return 0;
  const maxPerRow = Math.max(1, Math.floor(availableWidth / DESKTOP_CARD_WIDTH));
  const rowCount = Math.ceil(count / maxPerRow);
  return Math.ceil(count / rowCount);
};
