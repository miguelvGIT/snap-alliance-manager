import { useEffect, useRef, useState } from 'react';
import { Plus, UserRound, ArrowUpRight } from 'lucide-react';
import type { Dataset, Player } from '../domain/model';
import { addPlayer, renamePlayer, recordDeparture, recordRejoining } from '../domain/actions';
import { weekBounds, weekLabel, dateTime, toLocalInput, fromLocalInput } from '../domain/weeks';
import { metrics } from '../domain/metrics';
import { uuid, nowISO } from '../domain/model';
import type { Commit } from './useAlliance';
import { Modal, Field, Notice, number } from './Modal';
import s from './ui.module.css';
export function PlayerForm({
  data,
  player,
  initialName,
  initialJoinedAt,
  onSave,
  onClose,
}: {
  data: Dataset;
  player?: Player;
  initialName?: string;
  initialJoinedAt?: string;
  onSave: (next: Dataset, id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(player?.name ?? initialName ?? ''),
    [social, setSocial] = useState(player?.social ?? ''),
    [joined, setJoined] = useState(toLocalInput(initialJoinedAt ?? weekBounds().start)),
    [error, setError] = useState('');
  return (
    <Modal title={player ? 'Edit player' : 'Add player'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const id = player?.id ?? uuid();
            const next = player
              ? renamePlayer(data, id, name, social)
              : addPlayer(data, name, social, fromLocalInput(joined), id);
            await onSave(next, id);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Field label="In-game name">
          <input
            required
            maxLength={150}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Discord, X or other contact" hint="Optional. Helps you recognize the player.">
          <input value={social} onChange={(e) => setSocial(e.target.value)} maxLength={200} />
        </Field>
        {!player && (
          <Field
            label="Alliance joining date"
            hint={
              initialJoinedAt
                ? 'Defaults to the selected week’s start. Correct it if the player joined later; joining mid-week exempts that first week.'
                : 'Joining mid-week automatically exempts that first week.'
            }
          >
            <input
              type="datetime-local"
              required
              value={joined}
              onChange={(e) => setJoined(e.target.value)}
            />
          </Field>
        )}
        {player && <Notice>Previous results and observed names are kept.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className={s.primary} disabled={!name.trim()}>
            {player ? 'Confirm changes' : 'Add player'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export default function Players({ data, commit }: { data: Dataset; commit: Commit }) {
  const [edit, setEdit] = useState<Player | 'new' | null>(null),
    [selected, setSelected] = useState<Player | null>(null),
    [query, setQuery] = useState(''),
    [participation, setParticipation] = useState<{
      player: Player;
      action: 'leave' | 'return';
    } | null>(null),
    [at, setAt] = useState(toLocalInput(nowISO())),
    [departureReason, setDepartureReason] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [failure, setFailure] = useState('');
  const matching = data.players.filter((p) =>
    [p.name, p.social, ...p.aliases.map((a) => a.name)].some((value) =>
      value.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    ),
  );
  const active = matching.filter((p) => p.memberships.some((m) => !m.leftAt));
  const lastDeparture = (p: Player) =>
    p.memberships.filter((m) => m.leftAt).sort((a, b) => b.leftAt!.localeCompare(a.leftAt!))[0];
  const former = matching
    .filter((p) => !p.memberships.some((m) => !m.leftAt))
    .sort((a, b) => (lastDeparture(b)?.leftAt ?? '').localeCompare(lastDeparture(a)?.leftAt ?? ''));
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus({ preventScroll: true });
      noticeRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [notice]);
  const profile = selected ? data.players.find((p) => p.id === selected.id) : null;
  return (
    <>
      <div className={s.titleRow}>
        <div>
          <h1>Players</h1>
          <p>Names can change. History stays.</p>
        </div>
        <button className={s.primary} onClick={() => setEdit('new')}>
          <Plus size={16} /> Add player
        </button>
      </div>
      <div className={s.toolbar}>
        <label className={s.search}>
          <span>Search players</span>
          <input
            placeholder="Name, previous name or contact"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {notice && (
        <p ref={noticeRef} tabIndex={-1} role="status" className={s.success}>
          {notice}
        </p>
      )}
      <section className={s.panel} aria-label="Alliance roster">
        <div className={s.panelHeading}>
          <h2>Alliance roster</h2>
          <span>
            {active.length} {active.length === 1 ? 'player' : 'players'}
          </span>
        </div>
        {!active.length ? (
          <div className={s.empty}>
            <UserRound size={26} />
            <h3>{query ? 'No matching active players' : 'No active players'}</h3>
            <p>
              {query
                ? 'Try a different name or contact. Former players are listed below.'
                : 'Add players or read screenshots of the weekly table.'}
            </p>
            {!query && <button onClick={() => setEdit('new')}>Add player</button>}
          </div>
        ) : (
          <div className={s.playerList}>
            {active.map((player) => (
              <button key={player.id} className={s.playerRow} onClick={() => setSelected(player)}>
                <span className={s.avatar}>{player.name.slice(0, 2)}</span>
                <span>
                  <strong>{player.name}</strong>
                  <small>{player.social || 'No social contact'}</small>
                </span>
                <span className={s.rowEnd}>
                  In the alliance
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className={s.panel} aria-label="Former players">
        <div className={s.panelHeading}>
          <div>
            <h2>Former players</h2>
            <p>
              Departure dates and reasons. Open a player to view their full history or record
              rejoining.
            </p>
          </div>
          <span>
            {former.length} {former.length === 1 ? 'player' : 'players'}
          </span>
        </div>
        {!former.length ? (
          <p className={s.emptyLine}>
            {query ? 'No former players match your search.' : 'No departures recorded yet.'}
          </p>
        ) : (
          <div className={s.playerList}>
            {former.map((player) => {
              const departure = lastDeparture(player);
              return (
                <button
                  key={player.id}
                  className={[s.playerRow, s.formerPlayerRow].join(' ')}
                  onClick={() => setSelected(player)}
                >
                  <span className={s.avatar}>{player.name.slice(0, 2)}</span>
                  <span>
                    <strong>{player.name}</strong>
                    <small>{player.social || 'No social contact'}</small>
                    <small>
                      {departure?.leftAt
                        ? 'Left ' + dateTime(departure.leftAt)
                        : 'Departure date not recorded'}
                    </small>
                    <span className={s.departureReason}>
                      Reason: {departure?.departureReason ?? 'No departure reason recorded'}
                    </span>
                  </span>
                  <span className={s.rowEnd}>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      {edit && (
        <PlayerForm
          data={data}
          player={edit === 'new' ? undefined : edit}
          onClose={() => setEdit(null)}
          onSave={async (next) => {
            await commit(next);
          }}
        />
      )}
      {profile && (
        <Modal title={profile.name} onClose={() => setSelected(null)}>
          <p>{profile.social || 'No social contact'}</p>
          <div className={s.metrics}>
            <div>
              <span>Historical average</span>
              <strong>{number(metrics(data, profile).average, 2)}</strong>
            </div>
            <div>
              <span>Missed minimums</span>
              <strong>{metrics(data, profile).failures}</strong>
            </div>
          </div>
          <h3>Previous names</h3>
          {profile.aliases.length ? (
            <ul>
              {profile.aliases.map((alias, index) => (
                <li key={index}>
                  {alias.name} <small>{dateTime(alias.changedAt)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No name changes recorded yet.</p>
          )}
          <h3>Membership periods</h3>
          <ul>
            {profile.memberships.map((m) => (
              <li key={m.id}>
                {dateTime(m.joinedAt)} → {m.leftAt ? dateTime(m.leftAt) : 'Present'}
                {m.leftAt && (
                  <small className={s.departureReason}>
                    Reason for leaving: {m.departureReason ?? 'No departure reason recorded'}
                  </small>
                )}
              </li>
            ))}
          </ul>
          <h3>Results and exemptions</h3>
          <div className={s.detailList}>
            {data.weeks
              .filter((w) => w.results[profile.id] || w.exemptions[profile.id])
              .sort((a, b) => b.start.localeCompare(a.start))
              .map((w) => (
                <div key={w.id}>
                  <span>{weekLabel(w)}</span>
                  <strong>{number(w.results[profile.id]?.points ?? null)}</strong>
                  <small>{w.exemptions[profile.id]?.reason ?? 'No exemption'}</small>
                  <small>Observed name: {w.results[profile.id]?.observedName ?? '—'}</small>
                </div>
              ))}
          </div>
          <footer>
            <button
              onClick={() => {
                setEdit(profile);
                setSelected(null);
              }}
            >
              Edit name or contact
            </button>
            <button
              onClick={() => {
                setParticipation({
                  player: profile,
                  action: profile.memberships.some((m) => !m.leftAt) ? 'leave' : 'return',
                });
                setAt(toLocalInput(nowISO()));
                setDepartureReason('');
                setFailure('');
                setNotice('');
                setSelected(null);
              }}
            >
              {' '}
              {profile.memberships.some((m) => !m.leftAt)
                ? 'Remove from roster'
                : 'Record rejoining'}
            </button>
          </footer>
        </Modal>
      )}
      {participation && (
        <Modal
          title={
            participation.action === 'leave' ? 'Remove player from roster?' : 'Record rejoining'
          }
          onClose={() => {
            if (!busy) setParticipation(null);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setFailure('');
              try {
                await commit(
                  participation.action === 'leave'
                    ? recordDeparture(
                        data,
                        participation.player.id,
                        fromLocalInput(at),
                        departureReason,
                      )
                    : recordRejoining(data, participation.player.id, fromLocalInput(at)),
                  { publishAfterSave: true },
                );
                setNotice(
                  participation.action === 'leave'
                    ? participation.player.name +
                        ' moved to Former players. Their history and departure reason are saved.'
                    : participation.player.name +
                        ' rejoined the active roster. Previous departure records are kept.',
                );
                setParticipation(null);
              } catch (e) {
                setFailure((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>The history of {participation.player.name} will be kept.</p>
            {participation.action === 'leave' && (
              <Notice>
                This records their departure from the active roster. Their name, contact and scores
                remain available in Former players.
              </Notice>
            )}
            <Field label="Date and time">
              <input
                type="datetime-local"
                required
                disabled={busy}
                value={at}
                onChange={(e) => setAt(e.target.value)}
              />
            </Field>
            {participation.action === 'leave' && (
              <Field label="Reason for leaving (required)">
                <textarea
                  aria-label="Reason for leaving (required)"
                  required
                  rows={3}
                  maxLength={2000}
                  value={departureReason}
                  disabled={busy}
                  onChange={(e) => setDepartureReason(e.target.value)}
                />
              </Field>
            )}
            {failure && <Notice tone="error">{failure}</Notice>}
            <footer>
              <button type="button" disabled={busy} onClick={() => setParticipation(null)}>
                Cancel
              </button>
              <button
                className={s.primary}
                disabled={busy || (participation.action === 'leave' && !departureReason.trim())}
              >
                {busy
                  ? 'Saving…'
                  : participation.action === 'leave'
                    ? 'Confirm removal'
                    : 'Confirm rejoining'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
