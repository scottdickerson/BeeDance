import { useEffect, useRef, useState } from 'react';
import styles from './Bee.module.css';

type BeeColor = 'gold' | 'amber' | 'cyan' | 'rose' | 'violet' | 'mint';

const COLOR_CLASS: Record<BeeColor, string> = {
  gold: styles.colorGold,
  amber: styles.colorAmber,
  cyan: styles.colorCyan,
  rose: styles.colorRose,
  violet: styles.colorViolet,
  mint: styles.colorMint
};

const MOOD = ['smile', 'flat', 'frown'] as const;
type Mood = (typeof MOOD)[number];

export function Bee({
  role,
  color,
  leaderMood,
  followerMood,
  moving,
  dancing,
  hit,
  happy,
  buttWiggle,
  pollen
}: {
  role: 'leader' | 'follower';
  color?: BeeColor;
  leaderMood?: Mood;
  followerMood?: Mood;
  moving: boolean;
  dancing: boolean;
  hit?: boolean;
  happy?: boolean;
  buttWiggle?: boolean;
  pollen?: boolean;
}): JSX.Element {
  const resolvedColor: BeeColor = color ?? (role === 'follower' ? 'cyan' : 'gold');
  const isLeaderFlat = role === 'leader' && leaderMood === 'flat';
  const isLeaderFrown = role === 'leader' && leaderMood === 'frown';
  const isFollowerFrown = role === 'follower' && followerMood === 'frown';
  const showFrown = isLeaderFrown || isFollowerFrown;

  const [isPulsing, setIsPulsing] = useState(false);
  const prevLeaderMoodRef = useRef(leaderMood);

  useEffect(() => {
    if (role !== 'leader' || leaderMood === undefined) return;
    if (prevLeaderMoodRef.current !== leaderMood) {
      prevLeaderMoodRef.current = leaderMood;
      setIsPulsing(true);
      const t = window.setTimeout(() => {
        setIsPulsing(false);
      }, 1000);
      return () => window.clearTimeout(t);
    }
  }, [role, leaderMood]);

  return (
    <div
      className={`${styles.bee} ${role === 'leader' ? styles.leader : styles.follower} ${COLOR_CLASS[resolvedColor]} ${isLeaderFlat ? styles.leaderFlat : ''} ${showFrown ? styles.leaderFrown : ''} ${moving ? styles.moving : ''} ${dancing ? styles.dancing : ''} ${hit ? styles.hit : ''} ${happy ? styles.happy : ''} ${buttWiggle ? styles.buttWiggle : ''} ${isPulsing ? styles.leaderMoodPulse : ''}`}
    >
      <div className={`${styles.wing} ${styles.wingBackLeft}`} />
      <div className={`${styles.wing} ${styles.wingBackRight}`} />
      <div className={`${styles.wing} ${styles.wingLeft}`} />
      <div className={`${styles.wing} ${styles.wingRight}`} />

      <div className={`${styles.antenna} ${styles.antennaLeft}`}>
        <span className={styles.antennaTip} />
      </div>
      <div className={`${styles.antenna} ${styles.antennaRight}`}>
        <span className={styles.antennaTip} />
      </div>

      <div className={styles.thorax} />
      <div className={styles.butt} />
      <div className={styles.stinger} />
      <div className={`${styles.leg} ${styles.legLeftFront}`} />
      <div className={`${styles.leg} ${styles.legLeftMid}`} />
      <div className={`${styles.leg} ${styles.legLeftRear}`} />
      <div className={`${styles.leg} ${styles.legRightFront}`} />
      <div className={`${styles.leg} ${styles.legRightMid}`} />
      <div className={`${styles.leg} ${styles.legRightRear}`} />
      {pollen && (
        <>
          <div className={`${styles.pollenBall} ${styles.pollenLeft}`} />
          <div className={`${styles.pollenBall} ${styles.pollenRight}`} />
        </>
      )}

      <div className={`${styles.eye} ${styles.eyeLeft}`} />
      <div className={`${styles.eye} ${styles.eyeRight}`} />
      <div className={styles.mouth} />

      {showFrown && (
        <>
          <div className={`${styles.brow} ${styles.browLeft}`} />
          <div className={`${styles.brow} ${styles.browRight}`} />
        </>
      )}
    </div>
  );
}
