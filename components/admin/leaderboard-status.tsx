export function LeaderboardStatus({ joined }: { joined: boolean | null }) {
  return <span className={`analytics-source ${joined ? 'recording' : 'leaderboard-hidden'}`}>
    {joined === true ? 'Joined' : joined === false ? 'Not participating' : 'Unavailable'}
  </span>;
}
