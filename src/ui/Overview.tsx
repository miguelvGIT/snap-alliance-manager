import { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ClipboardList,
  Plus,
  Search,
  ShieldCheck,
  Clock3,
} from 'lucide-react';
import type { Dataset } from '../domain/model';
import { weekBounds, shiftWeek, weekLabel, dateTime, nextReset } from '../domain/weeks';
import { metrics, scoreStatus } from '../domain/metrics';
import { exportBackup, downloadText } from '../domain/transfer';
import { number } from './Modal';
import s from './ui.module.css';
export default function Overview({
  data,
  navigate,
  syncStatus,
}: {
  data: Dataset;
  navigate: (route: string) => void;
  syncStatus: string;
}) {
  const [query, setQuery] = useState(''),
    [attention, setAttention] = useState(false),
    [sort, setSort] = useState<'name' | 'failures' | 'average'>('failures');
  const locale = navigator.language,
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentWeek = weekBounds().id;
  const columns = useMemo(() => {
    const all = new Map(data.weeks.map((w) => [w.id, w]));
    for (let i = 0; i < 8; i++) {
      const bounds = shiftWeek(currentWeek, -i);
      if (!all.has(bounds.id))
        all.set(bounds.id, {
          ...bounds,
          minimum: data.alliance.minimum,
          goal: data.alliance.goal,
          status: 'draft',
          incomplete: false,
          results: {},
          exemptions: {},
          collections: [],
        });
    }
    return [...all.values()].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  }, [data, currentWeek]);
  const rows = data.players.map((player) => ({ player, ...metrics(data, player) }));
  const filtered = rows
    .filter((row) => !attention || row.failures >= 2)
    .filter(({ player: p }) =>
      [p.name, p.social, ...p.aliases.map((a) => a.name)].some((n) =>
        n.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.player.name.localeCompare(b.player.name)
        : sort === 'failures'
          ? b.failures - a.failures
          : (b.average ?? -1) - (a.average ?? -1),
    );
  const latest = data.weeks
    .filter((w) => w.status === 'validated' && Date.parse(w.end) <= Date.now())
    .sort((a, b) => b.start.localeCompare(a.start))[0];
  const total = latest
    ? Object.values(latest.results).reduce((sum, result) => sum + (result.points ?? 0), 0)
    : 0;
  const goal = latest?.goal ?? data.alliance.goal;
  const active = data.players.filter((p) => p.memberships.some((m) => !m.leftAt)).length;
  const troubled = rows.filter((row) => row.failures >= 2).length;
  return (
    <>
      <div className={s.titleRow}>
        <div>
          <h1>{data.alliance.name}</h1>
          <p>Weekly contributions, with a history.</p>
        </div>
        <button className={s.primary} onClick={() => navigate('week')}>
          <Plus size={16} /> Record scores
        </button>
      </div>
      <section className={s.summaryGrid} aria-label="Alliance summary">
        <div className={s.panel}>
          <div className={s.panelHeading}>
            <h2>{latest ? 'Latest validated week' : 'Alliance target'}</h2>
            <span>{latest ? weekLabel(latest, locale, zone) : 'Waiting for the first record'}</span>
          </div>
          <div className={s.progressNumbers}>
            <strong>
              {number(total)} <small>points</small>
            </strong>
            <span>of {number(goal)}</span>
          </div>
          <div
            className={s.progress}
            role="progressbar"
            aria-label="Alliance points"
            aria-valuenow={total}
            aria-valuemin={0}
            aria-valuemax={Math.max(goal, total)}
          >
            <span style={{ width: (goal ? Math.min(100, (total / goal) * 100) : 0) + '%' }} />
          </div>
          <div className={s.summaryFacts}>
            <span>{active} players in the alliance</span>
            <button className={s.textButton} onClick={() => navigate('history')}>
              {
                data.weeks.filter(
                  (w) => w.status === 'validated' && Date.parse(w.end) <= Date.now(),
                ).length
              }{' '}
              completed weeks <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className={s.attentionPanel}>
          <ShieldCheck size={19} />
          <h2>Needs attention</h2>
          <strong>
            {troubled} {troubled === 1 ? 'player' : 'players'}
          </strong>
          <p>
            {latest
              ? 'Two or more missed weekly minimums.'
              : 'Record a completed week to review missed minimums.'}
          </p>
          <button className={s.textButton} onClick={() => setAttention(!attention)}>
            Review players <ArrowRight size={14} />
          </button>
        </div>
      </section>
      <section className={s.panel}>
        <div className={s.panelHeading}>
          <div>
            <h2>Player history</h2>
            <p>Averages and missed minimums across all eligible history.</p>
          </div>
          <button
            onClick={() =>
              downloadText(
                exportBackup(data),
                'alliance-' + new Date().toISOString().slice(0, 10) + '.json',
              )
            }
          >
            <ArrowDownToLine size={16} /> Export data
          </button>
        </div>
        <div className={s.toolbar}>
          <label className={s.search}>
            <Search size={16} />
            <span className={s.srOnly}>Search players</span>
            <input
              placeholder="Name or contact"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className={s.controls}>
            <label className={s.srOnly} htmlFor="sort">
              Sort players
            </label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="failures">Most missed minimums</option>
              <option value="average">Highest average</option>
              <option value="name">Player name</option>
            </select>
            <button aria-pressed={attention} onClick={() => setAttention(!attention)}>
              Needs attention{attention ? ' · active' : ''}
            </button>
          </div>
        </div>
        {!data.players.length ? (
          <div className={s.empty}>
            <ClipboardList size={30} />
            <h2>Your history starts here</h2>
            <p>Paste the points table or add your players. Your data stays on this device.</p>
            <button className={s.primary} onClick={() => navigate('week')}>
              Record your first week <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div
            className={s.tableScroll}
            tabIndex={0}
            aria-label="Contribution table, scrollable horizontally"
          >
            <table>
              <thead>
                <tr>
                  <th className={s.sticky}>In-game name</th>
                  <th>Social contact</th>
                  <th className={s.numeric}>Missed minimums</th>
                  <th className={s.numeric}>Average points</th>
                  {columns.map((w) => (
                    <th key={w.id} className={s.numeric}>
                      <button
                        className={s.tableHeaderLink}
                        onClick={() => navigate('week?week=' + encodeURIComponent(w.id))}
                      >
                        {weekLabel(w, locale, zone)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.player.id}>
                    <td className={s.sticky}>
                      <strong>{row.player.name}</strong>
                      {row.failures >= 2 && (
                        <small className={s.danger}>Repeated missed minimums</small>
                      )}
                    </td>
                    <td>{row.player.social || '—'}</td>
                    <td className={s.numeric}>
                      <span className={row.failures >= 2 ? s.danger : undefined}>
                        {row.failures}
                      </span>
                      <small>{row.evaluated} weeks assessed</small>
                    </td>
                    <td className={s.numeric}>
                      {number(row.average, 2)}
                      {row.evaluated === 0 && <small>No eligible scores</small>}
                    </td>
                    {columns.map((w) => (
                      <td key={w.id} className={s.numeric}>
                        <button
                          className={s.scoreButton}
                          onClick={() => navigate('week?week=' + encodeURIComponent(w.id))}
                        >
                          {number(w.results[row.player.id]?.points ?? null)}
                        </button>
                        {w.results[row.player.id] && (
                          <small>
                            {w.status === 'draft'
                              ? 'Draft'
                              : Date.parse(w.end) > Date.now()
                                ? 'Current week'
                                : scoreStatus(w, row.player)}
                          </small>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <p className={s.emptyLine}>No players match your search.</p>}
          </div>
        )}
        <div className={s.panelFoot}>
          <span>
            <ShieldCheck size={14} />
            {syncStatus}
          </span>
          <button className={s.textButton} onClick={() => navigate('history')}>
            Browse all weeks <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </>
  );
}
