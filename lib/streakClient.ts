import confetti from 'canvas-confetti';

export async function logStreakAction(actionName: string, xpReward = 10, triggerCelebration = false) {
  try {
    const res = await fetch('/api/streak/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionName, xp_reward: xpReward })
    });
    const data = await res.json();
    
    if (data.success && triggerCelebration) {
      // High fidelity celebration
      const duration = 2000;
      const end = Date.now() + duration;

      try {
        const audio = new Audio('/sounds/success.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch(e) {}

      // Confetti
      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#4338CA', '#F59E0B', '#10B981'],
          zIndex: 9999
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#4338CA', '#F59E0B', '#10B981'],
          zIndex: 9999
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
      
      // Haptic feedback
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }
    }
    return data;
  } catch (error) {
    console.error("Failed to log streak action", error);
  }
}
