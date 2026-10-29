import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, AlertTriangle, Save, Check, ImagePlus, Info } from 'lucide-react';
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
import ImageViewer from './ImageViewer';
import type { ImageInput } from '../ocr/rows';
import { mergeImageLines, parseScore } from '../ocr/rows';
import { imageLabel, imageSourceLabel } from './imageLabels';
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
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
  const [intakePending, setIntakePending] = useState(false);
  const [nextWeek, setNextWeek] = useState<string | null>(null);
  const [weekLookup, setWeekLookup] = useState('');
  const [validating, setValidating] = useState(false);
  const [validatedNotice, setValidatedNotice] = useState(false);
  const [allowIncomplete, setAllowIncomplete] = useState(false);
  const [validationMarked, setValidationMarked] = useState(false);
  const [sourceLine, setSourceLine] = useState<string | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const savedRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!notice) return;
    const frame = requestAnimationFrame(() => {
      noticeRef.current?.focus({ preventScroll: true });
      noticeRef.current?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [notice]);
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
  const expected = expectedPlayers(data, week);
  const roster = data.players.filter(
    (player) => expected.some((p) => p.id === player.id) || player.id in week.results,
  );
  const outsideMembership = roster.filter((player) => !expected.some((p) => p.id === player.id));
  const reviewCollections = collection
    ? [...week.collections.filter((c) => c.id !== collection.id), collection]
    : week.collections;
  const pendingRows = reviewCollections
    .flatMap((c) => c.lines)
    .filter((line) => line.state === 'pending').length;
  const conflicts = reviewCollections
    .flatMap((c) => c.lines)
    .some((line) => line.state === 'confirmed' && line.pointsConflict);
  const validationScores = new Map(
    Object.entries(week.results)
      .filter(([, r]) => !collection || r.collectionId !== collection.id)
      .map(([id, r]) => [id, r.points]),
  );
  collection?.lines
    .filter((line) => line.state === 'confirmed' && line.playerId)
    .forEach((line) =>
      validationScores.set(line.playerId!, line.pointsConflict ? null : line.points),
    );
  const scoreCount = [...validationScores.values()].filter(
    (points) => typeof points === 'number',
  ).length;
  const savedScoreCount = Object.values(week.results).filter(
    (r) => typeof r.points === 'number',
  ).length;
  const lineIssues = new Map<string, { name?: string; points?: string; assignment?: string }>();
  collection?.lines
    .filter((line) => line.state !== 'excluded')
    .forEach((line) => {
      const issue: { name?: string; points?: string; assignment?: string } = {};
      if (!line.name.trim()) issue.name = 'Enter the player name.';
      if (line.state === 'pending')
        issue.assignment = 'Assign this row to a player, add a new player, or exclude it.';
      if (line.pointsConflict) issue.points = 'Choose or correct the different totals.';
      else if (line.points === null)
        issue.points = 'Missing score. Enter points or review this as an incomplete week.';
      else if (!Number.isSafeInteger(line.points) || line.points < 0)
        issue.points = 'Enter a whole number of points, zero or higher.';
      if (Object.keys(issue).length) lineIssues.set(line.id, issue);
    });
  const missingSaved = new Set(
    expected
      .filter(
        (player) =>
          validationScores.get(player.id) == null &&
          !collection?.lines.some(
            (line) => line.playerId === player.id && line.state === 'confirmed',
          ),
      )
      .map((player) => player.id),
  );
  const blockingReview =
    pendingRows > 0 ||
    conflicts ||
    collection?.lines.some(
      (line) =>
        line.state !== 'excluded' &&
        (!line.name.trim() ||
          (line.points !== null && (!Number.isSafeInteger(line.points) || line.points < 0))),
    );
  const needsAttention =
    lineIssues.size > 0 ||
    missingSaved.size > 0 ||
    scoreCount === 0 ||
    pendingRows > 0 ||
    conflicts;
  const detailLine = collection?.lines.find((line) => line.id === sourceLine);
  const observedTimes = week.collections
    .flatMap((c) => (c.observations ? c.observations.map((o) => o.observedAt) : [c.observedAt]))
    .filter((value): value is string => value !== null)
    .sort();
  const run = async (action: () => Promise<void>) => {
    setError('');
    setNotice('');
    setValidatedNotice(false);
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
    setNextWeek(null);
    setIntakePending(false);
    setValidationMarked(false);
    setSourceLine(null);
  };
  const requestWeek = (id: string) => {
    if (id === selected) return;
    if (collection || intakePending) setNextWeek(id);
    else chooseWeek(id);
  };
  const focusFirstMissing = () =>
    requestAnimationFrame(() => {
      const target =
        reviewRef.current?.querySelector<HTMLElement>('[data-validation-target="true"]') ??
        savedRef.current?.querySelector<HTMLElement>('[data-validation-target="true"]') ??
        reviewRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
  const openValidation = () => {
    setError('');
    setAllowIncomplete(false);
    setValidate(true);
  };
  const requestValidation = () => {
    setValidationMarked(true);
    setError('');
    setNotice('');
    if (!collection) {
      const unresolved = week.collections.find((c) =>
        c.lines.some(
          (line) => line.state === 'pending' || (line.state === 'confirmed' && line.pointsConflict),
        ),
      );
      if (unresolved) {
        setCollection(structuredClone(unresolved));
        setReferences([]);
      }
    }
    if (needsAttention) focusFirstMissing();
    else openValidation();
  };
  const returnToReview = () => {
    if (!collection) {
      const saved =
        week.collections.find((c) => c.lines.some((line) => line.state === 'pending')) ??
        week.collections.at(-1);
      if (saved) {
        setCollection(structuredClone(saved));
        setReferences([]);
      }
    }
    setValidate(false);
    focusFirstMissing();
  };
  return (
    <>
      <div className={s.titleRow}>
        <div>
          <h1>Record scores</h1>
          <p>Review and save weekly scores for {data.alliance.name}.</p>
        </div>
        <span className={s.badge}>{week.status === 'validated' ? 'Validated' : 'Draft'}</span>
      </div>
      <div className={s.weekScope}>
        <Field label="Week">
          <select
            value={selected}
            onChange={(e) => {
              setWeekLookup('');
              requestWeek(e.target.value);
            }}
          >
            {options.map((w) => (
              <option value={w.id} key={w.id}>
                {weekLabel(w, locale, zone)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Find week by date"
          hint="Optional shortcut using local date and time. This selects the week, not the capture time."
        >
          <input
            type="datetime-local"
            value={weekLookup}
            onChange={(e) => {
              setWeekLookup(e.target.value);
              if (e.target.value) requestWeek(weekBounds(fromLocalInput(e.target.value)).id);
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
        <div role="status" className={s.success} ref={noticeRef} tabIndex={-1}>
          <p>{notice}</p>
          {validatedNotice && <a href="#overview">View overview</a>}
        </div>
      )}
      {validationMarked && needsAttention && (
        <div role="alert" className={s.validationSummary}>
          <p>
            {scoreCount === 0 && !collection
              ? 'No scores to validate. Add images and read them to start your review.'
              : 'Check the highlighted fields. Missing scores, names and unresolved assignments need your attention.'}
          </p>
          {!blockingReview && scoreCount > 0 && (
            <button onClick={openValidation}>Review incomplete week</button>
          )}
        </div>
      )}
      <section className={s.panel} ref={reviewRef} tabIndex={-1} aria-label="Score review">
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
          onPendingChange={setIntakePending}
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
                      {imageLabel(collection.observations, o.id)} · {imageSourceLabel(o.source)} ·{' '}
                      {o.observedAt ? dateTime(o.observedAt) : 'Capture time unknown'}
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
                  .map((o) => imageLabel(collection.observations, o.id))
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
            {collection.lines.some((line) => line.state === 'pending') && (
              <Notice>
                Assign each row to an existing player, add it with New player, or exclude it.
                Unassigned rows stay in the draft and cannot be validated.
              </Notice>
            )}
            <div className={s.reviewList}>
              {collection.lines.map((line, index) => {
                const player = data.players.find((p) => p.id === line.playerId);
                const exact = data.players.some((p) => p.name === line.name);
                const old = data.players.some((p) => p.aliases.some((a) => a.name === line.name));
                const issue = validationMarked ? lineIssues.get(line.id) : undefined;
                return (
                  <div className={s.reviewRow} key={line.id}>
                    <div>
                      <label className={s.field}>
                        <span>Observed name · row {index + 1}</span>
                        <input
                          aria-invalid={!!issue?.name}
                          aria-describedby={issue?.name ? `name-error-${line.id}` : undefined}
                          data-validation-target={!!issue?.name}
                          value={line.name}
                          onBlur={() =>
                            run(async () => {
                              setCollection({
                                ...collection,
                                lines: mergeImageLines(collection.lines),
                              });
                            })
                          }
                          onChange={(e) =>
                            updateLine(line.id, {
                              name: e.target.value,
                              playerId: null,
                              state: 'pending',
                            })
                          }
                        />
                      </label>
                      {issue?.name && (
                        <small id={`name-error-${line.id}`} className={s.errorText}>
                          {issue.name}
                        </small>
                      )}
                      {line.sourceRows && line.sourceRows.length > 1 && (
                        <small>{line.sourceRows.length} matching observations · one score</small>
                      )}
                      {line.observationId && (!line.sourceRows || line.sourceRows.length === 1) && (
                        <small>{imageLabel(collection.observations, line.observationId)}</small>
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
                    <div>
                      <div className={s.pointsControl}>
                        <Field
                          label="Points"
                          hint={
                            !line.pointsConflict &&
                            line.points === null &&
                            line.rawPoints?.trim() &&
                            parseScore(line.rawPoints) === null
                              ? 'Unrecognized value: ' +
                                line.rawPoints +
                                '. Correct it or confirm that it should stay unrecorded.'
                              : undefined
                          }
                        >
                          <input
                            aria-label="Points"
                            aria-invalid={!!issue?.points}
                            aria-describedby={issue?.points ? `points-error-${line.id}` : undefined}
                            data-validation-target={!!issue?.points}
                            type="number"
                            min="0"
                            step="1"
                            value={line.points ?? ''}
                            onChange={(e) =>
                              updateLine(line.id, {
                                points: e.target.value === '' ? null : Number(e.target.value),
                                pointsConflict: false,
                              })
                            }
                          />
                        </Field>
                        {(line.sourceRows?.length || line.observationId) && (
                          <button
                            type="button"
                            className={s.scoreInfoButton}
                            aria-label={`Score details · row ${index + 1}`}
                            onClick={() => setSourceLine(line.id)}
                          >
                            <Info size={18} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {issue?.points && (
                        <small id={`points-error-${line.id}`} className={s.errorText}>
                          {issue.points}
                        </small>
                      )}
                      {line.pointsConflict && (
                        <div role="alert">
                          <p className={s.warningText}>
                            Different totals in these images. Choose a value or correct it above.
                          </p>
                          <div className={s.actions}>
                            {[
                              ...new Set(
                                line.sourceRows
                                  ?.map((row) => row.points)
                                  .filter((v): v is number => v !== null),
                              ),
                            ].map((points) => (
                              <button
                                key={points}
                                onClick={() =>
                                  updateLine(line.id, { points, pointsConflict: false })
                                }
                              >
                                Use {number(points)} points
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={s.rowActions}>
                      {line.playerId &&
                        week.results[line.playerId] &&
                        week.results[line.playerId].points !== line.points && (
                          <small className={s.warningText}>
                            Saved value: {number(week.results[line.playerId].points)}
                          </small>
                        )}
                      <button
                        aria-describedby={
                          issue?.assignment ? `assignment-error-${line.id}` : undefined
                        }
                        data-validation-target={!!issue?.assignment}
                        className={issue?.assignment ? s.invalidControl : undefined}
                        onClick={() =>
                          setAssociate({ line, playerId: line.playerId ?? '', rename: false })
                        }
                      >
                        Assign manually
                      </button>
                      {issue?.assignment && (
                        <small id={`assignment-error-${line.id}`} className={s.errorText}>
                          {issue.assignment}
                        </small>
                      )}
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
              <Field label="Revision note (optional)">
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
                onClick={() =>
                  run(async () => {
                    await commit(
                      saveCollection(base, selected, collection, {
                        reason: collectionReason,
                        allowReplacement: replacePoints,
                      }),
                    );
                    setNotice(
                      collection.lines.some((line) => line.state === 'pending')
                        ? 'Draft saved. Reopen the collection to assign or exclude pending rows before validating.'
                        : 'Collection saved as a draft. Validate it when you finish the review.',
                    );
                    setCollection(null);
                    setReferences([]);
                    setIntakeVersion((version) => version + 1);
                    setCollectionReason('');
                    setReplacePoints(false);
                  })
                }
              >
                <Save size={16} />{' '}
                {collection.lines.some((line) => line.state === 'pending')
                  ? 'Save draft'
                  : 'Save collection'}
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
              {references.map((image, index) => (
                <figure key={image.id}>
                  <button
                    type="button"
                    className={s.imagePreviewButton}
                    aria-label={'View reference image ' + (index + 1)}
                    onClick={() => setPreview({ ...image, name: `Image ${index + 1}` })}
                  >
                    <img src={image.url} alt={`Reference image ${index + 1}`} />
                    <span>View and zoom</span>
                  </button>
                  <figcaption>{`Image ${index + 1}`}</figcaption>
                </figure>
              ))}
            </div>
          </details>
        )}
      </section>
      <section className={s.panel} ref={savedRef}>
        <div className={s.panelHeading}>
          <div>
            <h2>Saved results</h2>
            <p>
              {week.incomplete
                ? 'Incomplete week · only known scores are assessed.'
                : 'Only completed, validated weeks count toward the metrics.'}
            </p>
            <p>
              {savedScoreCount} saved {savedScoreCount === 1 ? 'score' : 'scores'} ·{' '}
              {number(Object.values(week.results).reduce((sum, r) => sum + (r.points ?? 0), 0))}{' '}
              points
            </p>
          </div>
          <button className={s.primary} onClick={requestValidation}>
            Validate week
          </button>
        </div>
        {outsideMembership.length > 0 && (
          <Notice tone="warning">
            These scores are saved, but the players’ membership dates do not cover this week:{' '}
            {outsideMembership.map((p) => p.name).join(', ')}. Check their joining dates in Players
            before expecting historical metrics to include them.
          </Notice>
        )}
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
                    <td className={s.numeric}>
                      {number(week.results[player.id]?.points ?? null)}
                      {validationMarked && missingSaved.has(player.id) && (
                        <small className={s.errorText}>Missing score</small>
                      )}
                    </td>
                    <td>
                      {scoreStatus(week, player)}
                      {week.exemptions[player.id] && (
                        <small>{week.exemptions[player.id].reason}</small>
                      )}
                    </td>
                    <td>
                      <div className={s.rowActions}>
                        <button
                          data-validation-target={validationMarked && missingSaved.has(player.id)}
                          className={
                            validationMarked && missingSaved.has(player.id)
                              ? s.invalidControl
                              : undefined
                          }
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
            <button
              data-validation-target={
                validationMarked &&
                c.id !== collection?.id &&
                c.lines.some(
                  (line) =>
                    line.state === 'pending' || (line.state === 'confirmed' && line.pointsConflict),
                )
              }
              className={
                validationMarked &&
                c.lines.some((line) => line.state === 'pending' || line.pointsConflict)
                  ? s.invalidControl
                  : undefined
              }
              onClick={() => {
                setCollection(structuredClone(c));
                setReferences([]);
                requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ block: 'start' }));
              }}
            >
              Review saved collection
            </button>
            {c.observations && (
              <ul>
                {c.observations.map((o) => (
                  <li key={o.id}>
                    {imageLabel(c.observations, o.id)} · {imageSourceLabel(o.source)} ·{' '}
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
                  I confirm the current name changed to "{associate.line.name}"
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
          initialJoinedAt={week.start}
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
                  change(
                    base,
                    'week/' + selected,
                    reason.trim() || 'Points corrected manually',
                    (draft) => {
                      const w = draft.weeks.find((w) => w.id === selected)!;
                      const prior = w.results[correct.player.id];
                      w.results[correct.player.id] = {
                        points: correct.value === '' ? null : Number(correct.value),
                        observedName: prior?.observedName ?? correct.player.name,
                        collectionId: prior?.collectionId ?? null,
                      };
                    },
                  ),
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
            <Field label="Correction note (optional)">
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
              <button className={s.primary}>Confirm correction</button>
            </footer>
          </form>
        </Modal>
      )}
      {validate && (
        <Modal title="Validate week" onClose={() => setValidate(false)}>
          <p>{weekLabel(week, locale, zone)}</p>
          <p>
            {scoreCount} {scoreCount === 1 ? 'score' : 'scores'} ready to save and validate.
          </p>
          {collection && <p>Your current review will be saved together with this validation.</p>}
          {Date.parse(week.end) > Date.now() && (
            <p>
              Scores appear in the overview now. Averages and missed minimums update after this week
              ends.
            </p>
          )}
          {pendingRows > 0 && (
            <Notice tone="warning">
              {pendingRows} {pendingRows === 1 ? 'row still needs' : 'rows still need'} a player
              assignment or explicit exclusion. Use Assign manually or New player in the review.
            </Notice>
          )}
          {!pendingRows && scoreCount === 0 && (
            <Notice tone="warning">
              No scores are ready. Read images and review the players and points before validating.
            </Notice>
          )}
          {conflicts && (
            <Notice tone="warning">
              Choose or correct the different totals before validating.
            </Notice>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <label className={s.check}>
            <input
              type="checkbox"
              checked={allowIncomplete}
              onChange={(e) => setAllowIncomplete(e.target.checked)}
            />{' '}
            I confirm validation as incomplete if any data is missing
          </label>
          <footer>
            <button disabled={validating} onClick={returnToReview}>
              Return to review
            </button>
            <button
              className={s.primary}
              disabled={validating || blockingReview || scoreCount === 0}
              onClick={() =>
                run(async () => {
                  setValidating(true);
                  try {
                    const reviewed = collection
                      ? saveCollection(base, selected, collection, {
                          reason: collectionReason,
                          allowReplacement: replacePoints,
                        })
                      : base;
                    await commit(validateWeek(reviewed, selected, allowIncomplete), {
                      publishAfterSave: true,
                    });
                    setValidate(false);
                    setCollection(null);
                    setReferences([]);
                    setIntakeVersion((v) => v + 1);
                    setCollectionReason('');
                    setReplacePoints(false);
                    setValidatedNotice(true);
                    setValidationMarked(false);
                    setNotice(
                      `Week validated. ${scoreCount} ${scoreCount === 1 ? 'score' : 'scores'} saved on this device.${Date.parse(week.end) > Date.now() ? ' Averages and missed minimums update after this week ends.' : ''}`,
                    );
                  } finally {
                    setValidating(false);
                  }
                })
              }
            >
              Confirm validation
            </button>
          </footer>
        </Modal>
      )}
      {nextWeek && (
        <Modal
          title="Change week?"
          onClose={() => {
            setNextWeek(null);
            setWeekLookup('');
          }}
        >
          <p>
            You have images or a score review that have not been saved. Keep editing to save them,
            or discard them before changing weeks.
          </p>
          <footer>
            <button
              onClick={() => {
                setNextWeek(null);
                setWeekLookup('');
              }}
            >
              Keep editing
            </button>
            <button className={s.primary} onClick={() => chooseWeek(nextWeek)}>
              Discard and change week
            </button>
          </footer>
        </Modal>
      )}
      {preview && <ImageViewer image={preview} onClose={() => setPreview(null)} />}
      {detailLine && collection && (
        <Modal title="Score details" onClose={() => setSourceLine(null)}>
          <p>
            <strong>{detailLine.name}</strong> · {number(detailLine.points)} points
          </p>
          <p>Readings from your images. Repeated readings count as one score.</p>
          <ul className={s.sourceReadings}>
            {(
              detailLine.sourceRows ??
              (detailLine.observationId
                ? [
                    {
                      id: detailLine.id,
                      observationId: detailLine.observationId,
                      name: detailLine.name,
                      points: detailLine.points,
                    },
                  ]
                : [])
            ).map((row) => {
              const image = collection.observations?.find((o) => o.id === row.observationId);
              const reference = references.find((o) => o.id === row.observationId);
              const label = imageLabel(collection.observations, row.observationId);
              return (
                <li key={row.id}>
                  <strong>
                    {label} · {number(row.points)} points
                  </strong>
                  <p>
                    {row.name}
                    {image ? ` · ${imageSourceLabel(image.source)}` : ''}
                  </p>
                  <p>{image?.observedAt ? dateTime(image.observedAt) : 'Capture time unknown'}</p>
                  {reference && (
                    <button onClick={() => setPreview({ ...reference, name: label })}>
                      View {label.toLowerCase()}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {!references.length && (
            <p>
              Image files are only available during the original review. Saved readings and capture
              times are kept.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
