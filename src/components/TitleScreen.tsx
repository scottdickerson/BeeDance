import { useEffect, useRef, type CSSProperties } from 'react';
import { Bee } from './Bee';
import styles from './TitleScreen.module.css';

const BUZZ_TITLE_SRC = '/sounds/buzz-title.mp3';

interface TitleScreenProps {
  onStart: () => void;
  onShowInstructions?: () => void;
}

const TITLE_BEES: Array<{
  id: string;
  role: 'leader' | 'follower';
  color?: 'gold' | 'amber' | 'cyan' | 'rose' | 'violet' | 'mint';
  leaderMood?: 'smile' | 'flat' | 'frown';
  path: 'a' | 'b' | 'c';
  duration: string;
  delay: string;
  style: CSSProperties;
}> = [
  { id: 'leader-main', role: 'leader', color: 'gold', leaderMood: 'smile', path: 'a', duration: '8.5s', delay: '0s', style: { left: '22%', top: '28%' } },
  { id: 'follower-main', role: 'follower', color: 'cyan', path: 'b', duration: '7.3s', delay: '-1.4s', style: { right: '19%', bottom: '25%' } },
  { id: 'amber-1', role: 'leader', color: 'amber', leaderMood: 'smile', path: 'c', duration: '9.6s', delay: '-0.8s', style: { left: '8%', top: '58%' } },
  { id: 'mint-1', role: 'follower', color: 'mint', path: 'a', duration: '10.2s', delay: '-4.1s', style: { left: '70%', top: '14%' } },
  { id: 'rose-1', role: 'leader', color: 'rose', leaderMood: 'smile', path: 'b', duration: '8.9s', delay: '-2.7s', style: { left: '44%', top: '12%' } },
  { id: 'violet-1', role: 'follower', color: 'violet', path: 'c', duration: '11.4s', delay: '-6.2s', style: { right: '10%', top: '48%' } },
  { id: 'gold-2', role: 'leader', color: 'gold', leaderMood: 'smile', path: 'a', duration: '9.8s', delay: '-3.3s', style: { left: '12%', top: '18%' } },
  { id: 'mint-2', role: 'follower', color: 'mint', path: 'b', duration: '7.8s', delay: '-5.1s', style: { left: '58%', bottom: '12%' } },
  { id: 'rose-2', role: 'leader', color: 'rose', leaderMood: 'smile', path: 'c', duration: '10.8s', delay: '-7.4s', style: { right: '32%', bottom: '8%' } },
  { id: 'amber-2', role: 'follower', color: 'amber', path: 'a', duration: '8.2s', delay: '-1.9s', style: { left: '30%', bottom: '18%' } }
];

export function TitleScreen({ onStart, onShowInstructions }: TitleScreenProps): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    audioRef.current?.play().catch(() => {});
    return () => {
      audioRef.current?.pause();
      audioRef.current && (audioRef.current.currentTime = 0);
    };
  }, []);

  return (
    <div className={styles.overlay} onClick={onStart} onKeyDown={onStart} role="button" tabIndex={0} aria-label="Start game">
      <audio ref={audioRef} src={BUZZ_TITLE_SRC} loop aria-label="Background buzz" />
      <div className={styles.beeFlightLayer} aria-hidden>
        {TITLE_BEES.map((bee) => (
          <div
            key={bee.id}
            className={`${styles.flightBee} ${bee.path === 'a' ? styles.pathA : bee.path === 'b' ? styles.pathB : styles.pathC}`}
            style={{
              ...bee.style,
              '--flight-duration': bee.duration,
              '--flight-delay': bee.delay
            } as CSSProperties}
          >
            <Bee role={bee.role} color={bee.color} leaderMood={bee.leaderMood} moving dancing happy />
          </div>
        ))}
      </div>
      <div className={styles.content}>
        <h1 className={styles.gameTitle}>Bee Cool!</h1>
        <div className={styles.buttons}>
          <button type="button" className={styles.startButton} onClick={(e) => { e.stopPropagation(); onStart(); }}>
            Start
          </button>
          {onShowInstructions && (
            <button type="button" className={styles.howToPlayButton} onClick={(e) => { e.stopPropagation(); onShowInstructions(); }}>
              How to play
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
