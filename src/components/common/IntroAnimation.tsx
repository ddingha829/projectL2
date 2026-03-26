import React, { useState, useEffect } from 'react';
import styles from './IntroAnimation.module.css';

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0); // 0: init, 1: text1, 2: text2, 3: fadeout

  useEffect(() => {
    // Step 0 -> 1: Show image and text 1
    const timer1 = setTimeout(() => {
      setStep(1);
    }, 500);

    // Step 1 -> 2: Show text 2 after text 1 (1s)
    const timer2 = setTimeout(() => {
      setStep(2);
    }, 2500);

    // Step 2 -> 3: Fade out everything (1s)
    const timer3 = setTimeout(() => {
      setStep(3);
    }, 4500);

    // Complete
    const timer4 = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className={`${styles.overlay} ${step === 3 ? styles.fadeOut : ''}`}>
      <div className={styles.imageContainer}>
        <img 
          src="/intro-cave.jpg" 
          alt="Prehistoric Cave Painting" 
          className={styles.introImage}
        />
        <div className={styles.textContainer}>
          {step === 1 && (
            <h1 className={styles.fadeText}>원시시대부터 기록은 인간의 본능입니다</h1>
          )}
          {step === 2 && (
            <h1 className={styles.fadeText}>우리는 크게 달라지지 않았습니다...</h1>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntroAnimation;
