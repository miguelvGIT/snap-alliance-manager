import type { Dataset, Player, Week } from './model';
export function participation(player: Player, week: Week) {
  return player.memberships.filter(
    (m) =>
      Date.parse(m.joinedAt) < Date.parse(week.end) &&
      (!m.leftAt || Date.parse(m.leftAt) > Date.parse(week.start)),
  );
}
export function partialEntry(player: Player, week: Week) {
  return participation(player, week).some(
    (m) =>
      Date.parse(m.joinedAt) > Date.parse(week.start) &&
      Date.parse(m.joinedAt) < Date.parse(week.end),
  );
}
export function metrics(data: Dataset, player: Player, at = Date.now()) {
  const eligible = data.weeks.filter(
    (w) =>
      w.status === 'validated' &&
      Date.parse(w.end) <= at &&
      participation(player, w).length &&
      !partialEntry(player, w) &&
      typeof w.results[player.id]?.points === 'number',
  );
  const sum = eligible.reduce((total, w) => total + (w.results[player.id].points ?? 0), 0);
  const failures = eligible.filter(
    (w) =>
      w.minimum > 0 && (w.results[player.id].points ?? 0) < w.minimum && !w.exemptions[player.id],
  ).length;
  return {
    average: eligible.length ? sum / eligible.length : null,
    evaluated: eligible.length,
    failures,
  };
}
export function expectedPlayers(data: Dataset, week: Week, at: string | null = null) {
  return data.players.filter((p) =>
    p.memberships.some((m) =>
      at
        ? Date.parse(m.joinedAt) <= Date.parse(at) &&
          (!m.leftAt || Date.parse(m.leftAt) > Date.parse(at))
        : Date.parse(m.joinedAt) < Date.parse(week.end) &&
          (!m.leftAt || Date.parse(m.leftAt) > Date.parse(week.start)),
    ),
  );
}
export function scoreStatus(week: Week, player: Player) {
  if (partialEntry(player, week)) return 'Joined mid-week';
  if (week.exemptions[player.id]) return 'Excused';
  const points = week.results[player.id]?.points;
  if (points == null) return 'No record';
  return week.minimum > 0 && points < week.minimum ? 'Below minimum' : 'Met minimum';
}
