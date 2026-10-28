import { useState } from 'react';
import { Plus, UserRound, ArrowUpRight } from 'lucide-react';
import type { Dataset, Player } from '../domain/model';
import { addPlayer, renamePlayer, change } from '../domain/actions';
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
  onSave,
  onClose,
}: {
  data: Dataset;
  player?: Player;
  initialName?: string;
  onSave: (next: Dataset, id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(player?.name ?? initialName ?? ''),
    [social, setSocial] = useState(player?.social ?? ''),
    [joined, setJoined] = useState(toLocalInput(weekBounds().start)),
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
            hint="Joining mid-week automatically exempts that first week."
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
    [showArchived, setShowArchived] = useState(false),
    [participation, setParticipation] = useState<{
      player: Player;
      action: 'leave' | 'return';
    } | null>(null),
    [at, setAt] = useState(toLocalInput(nowISO())),
    [failure, setFailure] = useState('');
  const visible = data.players.filter(
    (p) =>
      (showArchived || p.memberships.some((m) => !m.leftAt)) &&
      [p.name, p.social, ...p.aliases.map((a) => a.name)].some((value) =>
        value.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
  );
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
        <label className={s.check}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />{' '}
          Include players who left
        </label>
      </div>
      <div className={s.panel}>
        <div className={s.panelHeading}>
          <h2>Alliance roster</h2>
          <span>{visible.length} players</span>
        </div>
        {!visible.length ? (
          <div className={s.empty}>
            <UserRound size={26} />
            <h2>No players yet</h2>
            <p>Add your alliance's players or start by pasting the weekly table.</p>
            <button onClick={() => setEdit('new')}>Add your first player</button>
          </div>
        ) : (
          <div className={s.playerList}>
            {visible.map((player) => (
              <button key={player.id} className={s.playerRow} onClick={() => setSelected(player)}>
                <span className={s.avatar}>{player.name.slice(0, 2)}</span>
                <span>
                  <strong>{player.name}</strong>
                  <small>{player.social || 'No social contact'}</small>
                </span>
                <span className={s.rowEnd}>
                  {player.memberships.some((m) => !m.leftAt) ? 'In the alliance' : 'Left'}
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
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
                setSelected(null);
              }}
            >
              {' '}
              {profile.memberships.some((m) => !m.leftAt) ? 'Record leaving' : 'Record rejoining'}
            </button>
          </footer>
        </Modal>
      )}
      {participation && (
        <Modal
          title={participation.action === 'leave' ? 'Confirm leaving' : 'Record rejoining'}
          onClose={() => setParticipation(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await commit(
                  change(
                    data,
                    'player/' + participation.player.id,
                    participation.action === 'leave' ? 'Leaving confirmed' : 'Rejoining confirmed',
                    (draft) => {
                      const p = draft.players.find((p) => p.id === participation.player.id)!;
                      const instant = fromLocalInput(at);
                      if (participation.action === 'leave') {
                        const m = p.memberships.find((m) => !m.leftAt)!;
                        if (instant < m.joinedAt)
                          throw new Error('The leaving date cannot be before the joining date.');
                        m.leftAt = instant;
                      } else p.memberships.push({ id: uuid(), joinedAt: instant, leftAt: null });
                    },
                  ),
                );
                setParticipation(null);
              } catch (e) {
                setFailure((e as Error).message);
              }
            }}
          >
            <p>The history of {participation.player.name} will be kept.</p>
            <Field label="Date and time">
              <input
                type="datetime-local"
                required
                value={at}
                onChange={(e) => setAt(e.target.value)}
              />
            </Field>
            {failure && <Notice tone="error">{failure}</Notice>}
            <footer>
              <button type="button" onClick={() => setParticipation(null)}>
                Cancel
              </button>
              <button className={s.primary}>Confirm</button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
