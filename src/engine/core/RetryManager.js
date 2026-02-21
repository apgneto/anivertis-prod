// core/RetryManager.js
class RetryManager {
  static async execute(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        
        console.log(`⏳ Retry ${i + 1}/${retries} após ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
}

module.exports = RetryManager;