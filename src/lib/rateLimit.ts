function createRateLimiter(limitMs?: number) {
  const rateLimitSet = new Set<string>();

  function canExecute(user: { [key: string]: any }) {
    return !rateLimitSet.has(user.id);
  }

  function execute(user: { [key: string]: any }, limitMs?: number) {
    rateLimitSet.add(user.id);
    if (typeof limitMs === "number")
      setTimeout(() => {
        rateLimitSet.delete(user.id);
      }, limitMs);
  }

  function finish(user: { [key: string]: any }) {
    rateLimitSet.delete(user.id);
  }

  return { canExecute, execute, finish };
}

// Example usage:
const limiter = createRateLimiter();

export { limiter };
