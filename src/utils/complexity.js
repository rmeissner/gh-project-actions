export const calculateComplexity = (mapped) => {
  if (!mapped) return 0;
  let sum = 0;
  for (const complexity in mapped) {
    sum += parseInt(complexity) * mapped[complexity];
  }
  return sum;
};
