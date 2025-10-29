import React from 'react';
import './Sparkles.css';

const NUM_SPARKLES = 30;

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

const Sparkles = () => {
  const sparkles = Array.from({ length: NUM_SPARKLES }).map((_, i) => {
    const driftX = getRandom(-35, 35);
    const driftY = getRandom(12, 28);
    const style = {
      left: `${getRandom(0, 100)}vw`,
      top: `${getRandom(0, 100)}vh`,
      animationDelay: `${getRandom(0, 3)}s`,
      animationDuration: `${getRandom(2.8, 5.2)}s`,
      width: `${getRandom(4, 10)}px`,
      height: `${getRandom(4, 10)}px`,
      '--drift-x': `${driftX}px`,
      '--drift-y': `${driftY}px`
    };
    return <span key={i} className="sparkle" style={style} />;
  });

  return <div className="sparkles-bg">{sparkles}</div>;
};

export default Sparkles;
