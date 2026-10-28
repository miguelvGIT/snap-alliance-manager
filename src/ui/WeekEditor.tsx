import { useMemo, useState } from 'react';
import { Plus, AlertTriangle, Save, Check, ImagePlus } from 'lucide-react';
import {
  type Dataset,
  type Week,
  type Collection,
  type Line,
  type Player,
  uuid,
  nowISO,
} from '../domain/model';
import {
  ensureWeek,
  nameReview,
  saveCollection,
  validateWeek,
  exempt,
  renamePlayer,
  change,
} from '../domain/actions';
import {
  weekBounds,
  shiftWeek,
  weekLabel,
  toLocalInput,
  fromLocalInput,
  dateTime,
} from '../domain/weeks';
import { scoreStatus, expectedPlayers } from '../domain/metrics';
import type { Commit } from './useAlliance';
import { Modal, Field, Notice, number } from './Modal';
import { PlayerForm } from './Players';
import s from './ui.module.css';
import ImageIntake from './ImageIntake';
import type { ImageInput } from '../ocr/rows';
export default function WeekEditor({
  data,
  commit,
  initialWeek,
}: {
  data: Dataset;
  commit: Commit;
  initialWeek?: string;
}) {
  const [selected, setSelected] = useState(initialWeek ?? weekBounds().id),
    [collection, setCollection] = useState<Collection | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [associate, setAssociate] = useState<{ line: Line; playerId: string; rename: boolean } | null>(
      null,
    ),
    [newLine, setNewLine] = useState<string | null>(null),
    [dispense, setDispense] = useState<Player | null>(null),
    [reason, setReason] = useState(''),
    [validate, setValidate] = useState(false),
    [correct, setCorrect] = useState<{ player: Player; value: string } | null>(null);
  const [collectionReason, setCollectionReason] = useState(''),
    [replacePoints, setReplacePoints] = useState(false);
  const [references, setReferences] = useState<ImageInput[]>([]);
  const [intakeVersion, setIntakeVersion] = useState(0);
  const locale = navigator.language,
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const options = useMemo(() => {
    const weeks = new Map(data.weeks.map((w) => [w.id, weekBounds(w.start)]));
    for (let i = 0; i < 52; i++) {
      const b = shiftWeek(weekBounds().start, -i);
      weeks.set(b.id, b);
    }
    weeks.set(selected, weekBounds(selected));
    return [...weeks.values()].sort((a, b) => b.start.localeCompare(a.start));
  }, [data.weeks, selected]);
  const base = ensureWeek(data, selected);
  const week = base.weeks.find((w) => w.id === selected)!;
  const review = collection ? nameReview(data, week, collection) : null;
  const roster = expectedPlayers(data, week);
  const observedTimes = week.collections
    .flatMap((c) => (c.observations ? c.observations.map((o) => o.observedAt) : [c.observedAt]))
    .filter((value): value is string => value !== null)
    .sort();
  const run = async (action: () => Promise<void>) => {
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const updateLine = (id: string, values: Partial<Line>) =>
    setCollection((c) =>
      c
        ? { ...c, lines: c.lines.map((line) => (line.id === id ? { ...line, ...values } : line)) }
        : c,
    );
  const chooseWeek = (id: string) => {
    setSelected(id);
    setCollection(null);
    setReferences([]);
    setError('');
    setNotice('');
  };
  return (
    <>
      <div className={s.titleRow}>
        <div>
          <h1>Record scores</h1>
          <p>Collect the scores, review player names, and save the week.</p>
        </div>
        <span className={s.badge}>{week.status === 'validated' ? 'Validated' : 'Draft'}</span>
      </div>
      <div className={s.weekScope}>
        <Field label="Week">
          <select value={selected} onChange={(e) => chooseWeek(e.target.value)}>
            {options.map((w) => (
              <option value={w.id} key={w.id}>
                {weekLabel(w, locale, zone)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Another date">
          <input
            type="date"
            onChange={(e) => {
              if (e.target.value) chooseWeek(weekBounds(e.target.value + 'T19:00:00Z').id);
            }}
          />
        </Field>
        <p>
          Minimum: <strong>{number(week.minimum)}</strong> points
          <br />
          Target: {number(week.goal)}
        </p>
      </div>
      {error && (
        <div role="alert">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {notice && (
        <p role="status" className={s.success}>
          {notice}
        </p>
      )}
      <section className={s.panel}>
        <div className={s.panelHeading}>
          <div>
            <h2>Score collection</h2>
            <p>Import screenshots or capture the game window, then review the results.</p>
          </div>
          <ImagePlus size={18} />
        </div>
        <ImageIntake
          key={selected + ':' + intakeVersion}
          hidden={!!collection}
          onReview={(result, images) => {
            setReferences(images);
            setCollection(result);
          }}
        />
        {!collection && week.collections.length > 0 && (
          <button
            onClick={() => {
              setReferences([]);
              setCollection(structuredClone(week.collections.at(-1)!));
            }}
          >
            Reopen latest collection
          </button>
        )}
        {collection && (
          <>
            <div className={s.panelHeading}>
              <div>
                <p>Reference: players recorded for {weekLabel(week, locale, zone)}</p>
                <p>
                  {collection.observedAt
                    ? 'Collected: ' + dateTime(collection.observedAt)
                    : 'Collection date and time not specified'}{' '}
                  · {collection.complete ? 'Complete list confirmed' : 'Partial collection'}
                </p>
              </div>
              <button onClick={() => setCollection(null)}>Back to images</button>
            </div>
            <Field
              label="Collection time"
              hint="An explicit change here applies to every image in this collection. Leave blank if unknown; the entry time is kept."
            >
              <input
                type="datetime-local"
                value={collection.observedAt ? toLocalInput(collection.observedAt) : ''}
                onChange={(e) =>
                  setCollection({
                    ...collection,
                    observedAt: e.target.value ? fromLocalInput(e.target.value) : null,
                    timeSource: e.target.value ? 'manual' : 'unknown',
                    observations: collection.observations?.map((o) => ({
                      ...o,
                      observedAt: e.target.value ? fromLocalInput(e.target.value) : null,
                      timeSource: e.target.value ? 'manual' : 'unknown',
                    })),
                  })
                }
              />
            </Field>
            {collection.observations && (
              <details className={s.captureStamp}>
                <summary>Image sources and capture times</summary>
                <ul>
                  {collection.observations.map((o) => (
                    <li key={o.id}>
                      {o.name} · {o.observedAt ? dateTime(o.observedAt) : 'Capture time unknown'} ·{' '}
                      {o.timeSource}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {collection.observations?.some((o) => o.rowsFound === 0) && (
              <Notice tone="warning">
                No player rows were detected in:{' '}
                {collection.observations
                  .filter((o) => o.rowsFound === 0)
                  .map((o) => o.name)
                  .join(', ')}
                . Check those images before confirming completeness.
              </Notice>
            )}
            <Notice tone="warning">
              Check every name and total score against your images. Text recognition can miss rows
              or read a different column. Confirm completeness only after checking the whole table.
            </Notice>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={collection.complete}
                onChange={(e) => setCollection({ ...collection, complete: e.target.checked })}
              />{' '}
              I confirm this list is complete
            </label>
            {review!.missing.length > 0 && (
              <Notice tone="warning">
                <AlertTriangle size={15} />{' '}
                {collection.complete
                  ? 'Name not found in the collected list'
                  : 'Not observed in this partial collection'}
                :{' '}
                {review!.missing
                  .map((p) => p.name + (p.social ? ' (' + p.social + ')' : ''))
                  .join(', ')}
                . Review the contacts; this is not a confirmed departure.
              </Notice>
            )}
            <div className={s.actions}>
              <button
                onClick={() =>
                  setCollection((c) =>
                    c
                      ? {
                          ...c,
                          lines: c.lines.map((line) => {
                            const matches = data.players.filter((p) => p.name === line.name);
                            return line.state === 'pending' && matches.length === 1
                              ? { ...line, playerId: matches[0].id, state: 'confirmed' }
                              : line;
                          }),
                        }
                      : c,
                  )
                }
              >
                <Check size={15} /> Confirm recognized current names
              </button>
              <span>
                {collection.lines.filter((l) => l.state === 'pending').length} pending rows
              </span>
            </div>
            <div className={s.reviewList}>
              {collection.lines.map((line, index) => {
                const player = data.players.find((p) => p.id === line.playerId);
                const exact = data.players.some((p) => p.name === line.name);
                const old = data.players.some((p) => p.aliases.some((a) => a.name === line.name));
                return (
                  <div className={s.reviewRow} key={line.id}>
                    <div>
                      <label className={s.field}>
                        <span>Observed name · row {index + 1}</span>
                        <input
                          value={line.name}
                          onChange={(e) =>
                            updateLine(line.id, {
                              name: e.target.value,
                              playerId: null,
                              state: 'pending',
                            })
                          }
                        />
                      </label>
                      {line.observationId && (
                        <small>
                          {collection.observations?.find((o) => o.id === line.observationId)?.name}
                        </small>
                      )}
                      {line.ocrConfidence !== undefined && line.ocrConfidence < 85 && (
                        <small className={s.warningText}>Uncertain reading · check this row</small>
                      )}
                      <small className={line.state === 'pending' ? s.warningText : undefined}>
                        {line.state === 'excluded'
                          ? 'Excluded from assessment'
                          : line.state === 'confirmed'
                            ? 'Assigned to ' + player?.name
                            : old
                              ? 'Previous name to confirm'
                              : !exact
                                ? 'Unknown name'
                                : 'Assignment to confirm'}
                      </small>
                    </div>
                    <Field
                      label="Points"
                      hint={
                        line.points === null && line.rawPoints?.trim()
                          ? 'Unrecognized value: ' +
                            line.rawPoints +
                            '. Correct it or confirm that it should stay unrecorded.'
                          : undefined
                      }
                    >
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={line.points ?? ''}
                        onChange={(e) =>
                          updateLine(line.id, {
                            points: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <div className={s.rowActions}>
                      {line.playerId &&
                        week.results[line.playerId] &&
                        week.results[line.playerId].points !== line.points && (
                          <small className={s.warningText}>
                            Saved value: {number(week.results[line.playerId].points)}
                          </small>
                        )}
                      <button
                        onClick={() =>
                          setAssociate({ line, playerId: line.playerId ?? '', rename: false })
                        }
                      >
                        Assign manually
                      </button>
                      <button onClick={() => setNewLine(line.id)}>New player</button>
                      <button
                        onClick={() =>
                          updateLine(line.id, {
                            state: line.state === 'excluded' ? 'pending' : 'excluded',
                            playerId: null,
                          })
                        }
                      >
                        {line.state === 'excluded' ? 'Restore' : 'Exclude from assessment'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {week.status === 'validated' && (
              <Field label="Reason for revising the week">
                <textarea
                  value={collectionReason}
                  onChange={(e) => setCollectionReason(e.target.value)}
                />
              </Field>
            )}
            <label className={s.check}>
              <input
                type="checkbox"
                checked={replacePoints}
                onChange={(e) => setReplacePoints(e.target.checked)}
              />{' '}
              I confirm replacing results that differ from saved values
            </label>
            <div className={s.actions}>
              <button
                className={s.primary}
                disabled={week.status === 'validated' && !collectionReason.trim()}
                onClick={() =>
                  run(async () => {
                    await commit(
                      saveCollection(base, selected, collection, {
                        reason: collectionReason,
                        allowReplacement: replacePoints,
                      }),
                    );
                    setNotice(
                      'Collection saved as a draft. Validate it when you finish the review.',
                    );
                    setCollection(null);
                    setReferences([]);
                    setIntakeVersion((version) => version + 1);
                    setCollectionReason('');
                    setReplacePoints(false);
                  })
                }
              >
                <Save size={16} /> Save collection
              </button>
              <button
                onClick={() =>
                  setCollection((c) =>
                    c
                      ? {
                          ...c,
                          lines: [
                            ...c.lines,
                            {
                              id: uuid(),
                              name: 'New name',
                              points: null,
                              playerId: null,
                              state: 'pending',
                            },
                          ],
                        }
                      : c,
                  )
                }
              >
                <Plus size={14} /> Add row
              </button>
            </div>
          </>
        )}
        {collection && references.length > 0 && (
          <details open>
            <summary>Reference images</summary>
            <div className={s.imageReference}>
              {references.map((image) => (
                <figure key={image.id}>
                  <a href={image.url} target="_blank" rel="noreferrer">
                    <img src={image.url} alt={'Reference: ' + image.name} />
                  </a>
                  <figcaption>{image.name}</figcaption>
                </figure>
              ))}
            </div>
          </details>
        )}
      </section>
      <section className={s.panel}>
        <div className={s.panelHeading}>
          <div>
            <h2>Saved results</h2>
            <p>
              {week.incomplete
                ? 'Incomplete week · only known scores are assessed.'
                : 'Only completed, validated weeks count toward the metrics.'}
            </p>
          </div>
          <button
            className={s.primary}
            onClick={() => {
              setValidate(true);
              setReason('');
            }}
          >
            Validate week
          </button>
        </div>
        {!roster.length ? (
          <p className={s.emptyLine}>Players appear here after they have been added or assigned.</p>
        ) : (
          <div className={s.tableScroll}>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th className={s.numeric}>Points</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <strong>{player.name}</strong>
                      <small>{player.social}</small>
                    </td>
                    <td className={s.numeric}>{number(week.results[player.id]?.points ?? null)}</td>
                    <td>
                      {scoreStatus(week, player)}
                      {week.exemptions[player.id] && (
                        <small>{week.exemptions[player.id].reason}</small>
                      )}
                    </td>
                    <td>
                      <div className={s.rowActions}>
                        <button
                          onClick={() => {
                            setCorrect({
                              player,
                              value: String(week.results[player.id]?.points ?? ''),
                            });
                            setReason('');
                          }}
                        >
                          Correct points
                        </button>
                        <button
                          onClick={() => {
                            setDispense(player);
                            setReason('');
                          }}
                        >
                          Excuse this week
                        </button>
                        {week.exemptions[player.id]?.kind === 'manual' && (
                          <button
                            onClick={() =>
                              run(async () => {
                                await commit(exempt(base, selected, player.id, null));
                              })
                            }
                          >
                            Remove exemption
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {observedTimes.length > 1 && (
          <p className={s.captureStamp}>
            Known collection interval: {dateTime(observedTimes[0])} -{' '}
            {dateTime(observedTimes.at(-1)!)}
          </p>
        )}
        {week.collections.map((c) => (
          <div className={s.captureStamp} key={c.id}>
            {c.observedAt
              ? 'Points collected at ' +
                dateTime(c.observedAt) +
                ' · ' +
                Math.round((Date.parse(week.end) - Date.parse(c.observedAt)) / 60000) +
                ' minutes before the reset'
              : 'Collection date and time not specified'}{' '}
            · source{' '}
            {c.timeSource === 'manual'
              ? 'manual'
              : c.timeSource === 'automatic'
                ? 'automatic'
                : 'not specified'}{' '}
            · Entered: {dateTime(c.createdAt)}
            {c.observations && (
              <ul>
                {c.observations.map((o) => (
                  <li key={o.id}>
                    {o.name} · {o.source} ·{' '}
                    {o.observedAt ? dateTime(o.observedAt) : 'Capture time unknown'} ·{' '}
                    {o.timeSource}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
      {data.revisions.filter((r) => r.entity === 'week/' + selected).length > 0 && (
        <details className={s.panel}>
          <summary>This week's revisions and reasons</summary>
          <ol>
            {data.revisions
              .filter((r) => r.entity === 'week/' + selected)
              .slice()
              .reverse()
              .map((r) => (
                <li key={r.id}>
                  {dateTime(r.at)} · {r.reason}
                </li>
              ))}
          </ol>
        </details>
      )}
      {associate && (
        <Modal title="Confirm player" onClose={() => setAssociate(null)}>
          <p>
            Observed name: <strong>{associate.line.name}</strong>
          </p>
          <Field label="Existing player">
            <select
              value={associate.playerId}
              onChange={(e) =>
                setAssociate({ ...associate, playerId: e.target.value, rename: false })
              }
            >
              <option value="">Select player</option>
              {data.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.social ? ' · ' + p.social : ''}
                  {p.aliases.length
                    ? ' · previous names: ' + p.aliases.map((a) => a.name).join(', ')
                    : ''}
                </option>
              ))}
            </select>
          </Field>
          {associate.playerId && (
            <>
              <p>
                The contact and full history of{' '}
                <strong>{data.players.find((p) => p.id === associate.playerId)?.name}</strong> will
                be kept.
              </p>
              {data.players.find((p) => p.id === associate.playerId)?.name !==
                associate.line.name && (
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={associate.rename}
                    onChange={(e) => setAssociate({ ...associate, rename: e.target.checked })}
                  />{' '}
                  I confirm the current name changed to Â«{associate.line.name}Â»
                </label>
              )}
            </>
          )}
          <footer>
            <button onClick={() => setAssociate(null)}>Cancel</button>
            <button
              className={s.primary}
              disabled={!associate.playerId}
              onClick={() =>
                run(async () => {
                  if (associate.rename)
                    await commit(renamePlayer(data, associate.playerId, associate.line.name));
                  updateLine(associate.line.id, {
                    playerId: associate.playerId,
                    state: 'confirmed',
                  });
                  setAssociate(null);
                })
              }
            >
              Confirm assignment
            </button>
          </footer>
        </Modal>
      )}
      {newLine && (
        <PlayerForm
          data={data}
          initialName={collection?.lines.find((line) => line.id === newLine)?.name}
          onClose={() => setNewLine(null)}
          onSave={async (next, id) => {
            await commit(next);
            updateLine(newLine, { playerId: id, state: 'confirmed' });
          }}
        />
      )}
      {dispense && (
        <Modal title={'Weekly exemption · ' + dispense.name} onClose={() => setDispense(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await commit(exempt(base, selected, dispense.id, reason));
                setDispense(null);
              });
            }}
          >
            <Field
              label="Reason (required)"
              hint="The reason will be available in this week's history."
            >
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </Field>
            <footer>
              <button type="button" onClick={() => setDispense(null)}>
                Cancel
              </button>
              <button className={s.primary} disabled={!reason.trim()}>
                Confirm exemption
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {correct && (
        <Modal title={'Correct points · ' + correct.player.name} onClose={() => setCorrect(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await commit(
                  change(base, 'week/' + selected, reason, (draft) => {
                    const w = draft.weeks.find((w) => w.id === selected)!;
                    const prior = w.results[correct.player.id];
                    w.results[correct.player.id] = {
                      points: correct.value === '' ? null : Number(correct.value),
                      observedName: prior?.observedName ?? correct.player.name,
                      collectionId: prior?.collectionId ?? null,
                    };
                  }),
                );
                setCorrect(null);
              });
            }}
          >
            <Field label="Points (blank means no record)">
              <input
                type="number"
                min="0"
                step="1"
                value={correct.value}
                onChange={(e) => setCorrect({ ...correct, value: e.target.value })}
              />
            </Field>
            <Field label="Reason for the correction">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Notice>
              Corrections keep the original collection time. For a new observation, record another
              collection.
            </Notice>
            <footer>
              <button type="button" onClick={() => setCorrect(null)}>
                Cancel
              </button>
              <button className={s.primary} disabled={!reason.trim()}>
                Confirm correction
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {validate && (
        <Modal title="Validate week" onClose={() => setValidate(false)}>
          <p>{weekLabel(week, locale, zone)}</p>
          <p>The current week counts toward metrics only after it ends.</p>
          {error && <Notice tone="error">{error}</Notice>}
          <label className={s.check}>
            <input
              type="checkbox"
              checked={reason === 'incomplete'}
              onChange={(e) => setReason(e.target.checked ? 'incomplete' : '')}
            />{' '}
            I confirm validation as incomplete if any data is missing
          </label>
          <footer>
            <button onClick={() => setValidate(false)}>Cancel</button>
            <button
              className={s.primary}
              onClick={() =>
                run(async () => {
                  await commit(validateWeek(base, selected, reason === 'incomplete'));
                  setValidate(false);
                  setNotice('Week validated.');
                })
              }
            >
              Confirm validation
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
