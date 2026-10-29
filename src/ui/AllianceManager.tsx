import { useEffect, useState } from 'react';
import { Download, Archive, ArrowRightLeft, Trash2 } from 'lucide-react';
import type { Dataset } from '../domain/model';
import {
  listAllianceArchives,
  deleteAllianceArchive,
  type AllianceArchive,
  type Disposition,
} from '../data/alliances';
import { dateTime } from '../domain/weeks';
import { exportBackup, downloadText } from '../domain/transfer';
import type { SwitchAlliance } from './useAlliance';
import { Modal, Field, Notice } from './Modal';
import s from './ui.module.css';
type Intent =
  | { kind: 'new' }
  | { kind: 'restore'; archive: AllianceArchive }
  | { kind: 'deleteArchive'; archive: AllianceArchive };
const filename = (name: string) =>
  name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 60) || 'alliance';
export default function AllianceManager({
  data,
  switchAlliance,
}: {
  data: Dataset;
  switchAlliance: SwitchAlliance;
}) {
  const [archives, setArchives] = useState<AllianceArchive[]>([]),
    [intent, setIntent] = useState<Intent | null>(null),
    [disposition, setDisposition] = useState<Disposition>('archive'),
    [confirmed, setConfirmed] = useState(false),
    [name, setName] = useState(''),
    [minimum, setMinimum] = useState('2700'),
    [goal, setGoal] = useState('80000'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const refresh = async () => setArchives(await listAllianceArchives());
  useEffect(() => {
    let mounted = true;
    const load = () => {
      void listAllianceArchives()
        .then((records) => {
          if (mounted) setArchives(records);
        })
        .catch(() => {
          if (mounted) setError('Could not read the archives. Existing data has been kept.');
        });
    };
    load();
    const channel = new BroadcastChannel('alliance-data');
    channel.onmessage = load;
    window.addEventListener('focus', load);
    return () => {
      mounted = false;
      channel.close();
      window.removeEventListener('focus', load);
    };
  }, []);
  const open = (next: Intent) => {
    setIntent(next);
    setDisposition('archive');
    setConfirmed(false);
    setError('');
    setMessage('');
    setName('');
    setMinimum('2700');
    setGoal('80000');
  };
  const close = () => {
    if (!busy) {
      setIntent(null);
      setError('');
      setConfirmed(false);
    }
  };
  const exportAlliance = (dataset: Dataset) =>
    downloadText(
      exportBackup(dataset),
      'alliance-' +
        filename(dataset.alliance.name) +
        '-' +
        new Date().toISOString().slice(0, 10) +
        '.json',
    );
  const submit = async () => {
    if (!intent || !confirmed || busy) return;
    setBusy(true);
    setError('');
    try {
      if (intent.kind === 'deleteArchive') {
        await deleteAllianceArchive(intent.archive);
        await refresh();
        const channel = new BroadcastChannel('alliance-data');
        channel.postMessage({ type: 'archives-changed' });
        channel.close();
        setIntent(null);
        setMessage('Archive deleted from this browser. The active alliance is unchanged.');
      } else {
        await switchAlliance(
          data,
          intent.kind === 'new'
            ? { kind: 'new', name, minimum: Number(minimum), goal: Number(goal), disposition }
            : {
                kind: 'restore',
                archiveId: intent.archive.id,
                expectedArchive: intent.archive,
                disposition,
              },
        );
        location.hash = 'overview';
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(
        (e as Error).name === 'QuotaExceededError'
          ? 'Not enough storage to archive this alliance. Your current alliance has not changed. Export a backup or free some browser storage before trying again.'
          : message,
      );
    } finally {
      setBusy(false);
    }
  };
  const deletingArchive = intent?.kind === 'deleteArchive';
  return (
    <>
      <section className={s.settingsSection}>
        <div>
          <h2>Change alliance</h2>
          <p>
            Start a separate alliance dashboard. Archive the current saved records or delete them
            after confirmation.
          </p>
        </div>
        <div className={s.panel}>
          <p>
            Current alliance: <strong>{data.alliance.name}</strong>
          </p>
          <p>
            {data.players.length} players · {data.weeks.length} weeks
          </p>
          <p>Changing the alliance name above keeps its existing records.</p>
          <button onClick={() => open({ kind: 'new' })}>
            <ArrowRightLeft size={16} /> Change alliance
          </button>
        </div>
      </section>
      <section className={s.settingsSection}>
        <div>
          <h2>Archived alliances</h2>
          <p>
            Saved only in this browser. Export each archive to keep a copy elsewhere. Clearing
            browser data also removes these archives.
          </p>
        </div>
        <div className={s.panel}>
          {!intent && error && (
            <div role="alert">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          {message && (
            <p role="status" className={s.success}>
              {message}
            </p>
          )}
          {!archives.length ? (
            <p>No archived alliances on this device.</p>
          ) : (
            <ul className={s.archiveList}>
              {archives.map((archive) => (
                <li key={archive.id}>
                  <div>
                    <strong>{archive.dataset.alliance.name}</strong>
                    {archive.id === data.alliance.id && (
                      <p>This alliance is already active; this is an archived copy.</p>
                    )}
                    <p>
                      {archive.dataset.players.length} players · {archive.dataset.weeks.length}{' '}
                      weeks
                      <br />
                      Archived {dateTime(archive.archivedAt)}
                    </p>
                  </div>
                  <div className={s.actions}>
                    <button onClick={() => exportAlliance(archive.dataset)}>
                      <Download size={16} /> Export archive
                    </button>
                    <button
                      disabled={archive.id === data.alliance.id}
                      onClick={() => open({ kind: 'restore', archive })}
                    >
                      <Archive size={16} /> Restore alliance
                    </button>
                    <button onClick={() => open({ kind: 'deleteArchive', archive })}>
                      <Trash2 size={16} /> Delete archive
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {intent && (
        <Modal
          title={
            deletingArchive
              ? 'Delete archived alliance?'
              : intent.kind === 'restore'
                ? 'Restore archived alliance?'
                : 'Change alliance'
          }
          onClose={close}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {intent.kind === 'new' ? (
              <>
                <Field label="New alliance name">
                  <input
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                  />
                </Field>
                <details>
                  <summary>New alliance minimum and target</summary>
                  <div className={s.formGrid}>
                    <Field label="New minimum per player">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={minimum}
                        onChange={(e) => setMinimum(e.target.value)}
                        disabled={busy}
                      />
                    </Field>
                    <Field label="New weekly target">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        disabled={busy}
                      />
                    </Field>
                  </div>
                </details>
                <p>The new dashboard starts with no players or weekly scores.</p>
              </>
            ) : (
              <p>
                <strong>{intent.archive.dataset.alliance.name}</strong> ·{' '}
                {intent.archive.dataset.players.length} players ·{' '}
                {intent.archive.dataset.weeks.length} weeks
              </p>
            )}
            {!deletingArchive && (
              <>
                <fieldset className={s.choiceGroup} disabled={busy}>
                  <legend>Saved records for {data.alliance.name}</legend>
                  <label className={s.check}>
                    <input
                      type="radio"
                      name="alliance-disposition"
                      checked={disposition === 'archive'}
                      onChange={() => {
                        setDisposition('archive');
                        setConfirmed(false);
                      }}
                    />{' '}
                    Archive current alliance
                  </label>
                  <label className={s.check}>
                    <input
                      type="radio"
                      name="alliance-disposition"
                      checked={disposition === 'delete'}
                      onChange={() => {
                        setDisposition('delete');
                        setConfirmed(false);
                      }}
                    />{' '}
                    Delete current alliance data
                  </label>
                </fieldset>
                <Notice tone="warning">
                  This switches the active alliance in every tab of this browser. Save open score
                  reviews first. Device reminders keep their current schedule.
                </Notice>
                <Notice tone={disposition === 'delete' ? 'error' : 'neutral'}>
                  {disposition === 'archive'
                    ? `The saved players, scores, history and reasons for ${data.alliance.name} will remain in Archived alliances. You can restore or export them later.`
                    : `The saved players, scores, contacts, history and reasons for ${data.alliance.name} will be deleted from this browser. This cannot be undone here. Previously exported files and copies on other devices are not deleted.`}
                </Notice>
                {intent.kind === 'restore' && (
                  <p>
                    The selected archive becomes active and leaves the archive list. Its player
                    identities, weekly scores and history are preserved.
                  </p>
                )}
              </>
            )}
            {deletingArchive && (
              <Notice tone="error">
                This permanently deletes this archived alliance from this browser. You cannot undo
                it here. The active alliance, other archives, exported files and copies on other
                devices are unchanged.
              </Notice>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => exportAlliance(deletingArchive ? intent.archive.dataset : data)}
            >
              <Download size={16} /> Export a backup first
            </button>
            {error && (
              <div role="alert">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
            <label className={s.check}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={busy}
              />
              {deletingArchive
                ? 'I confirm deleting this archive'
                : 'I understand and confirm this change'}
            </label>
            <footer>
              <button type="button" onClick={close} disabled={busy}>
                Cancel
              </button>
              <button
                className={s.primary}
                disabled={busy || !confirmed || (intent.kind === 'new' && !name.trim())}
              >
                {busy
                  ? 'Saving…'
                  : deletingArchive
                    ? 'Delete archive'
                    : intent.kind === 'restore'
                      ? disposition === 'archive'
                        ? 'Archive current and restore'
                        : 'Delete current and restore'
                      : disposition === 'archive'
                        ? 'Archive and change alliance'
                        : 'Delete data and change alliance'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
