import { useEffect, useState } from 'react';
import { Download, Upload, Link2, Unlink, Bell, CalendarDays, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import {
  allianceSchema,
  playerSchema,
  weekSchema,
  preferencesSchema,
  type Dataset,
} from '../domain/model';
import { change } from '../domain/actions';
import { dateTime, nextReset, weekLabel } from '../domain/weeks';
import { calendarFile, downloadText, exportBackup, readBackup } from '../domain/transfer';
import {
  readLocal,
  writeLocal,
  replaceDataset,
  disableSync,
  db,
  type SyncCredentials,
  type Conflict,
} from '../data/store';
import { api, enableSync, joinSnapshot, resolveConflict, type SyncEngine } from '../sync/client';
import type { Commit } from './useAlliance';
import { Modal, Field, Notice, number } from './Modal';
import s from './ui.module.css';
type JoinRequest = { id: string; label: string; verification: string };
type Reminder = { id: string; token: string; nextDue: number; resetAt: string };
const deviceSecret = () => {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};
export default function Settings({
  data,
  commit,
  reload,
  engine,
}: {
  data: Dataset;
  commit: Commit;
  reload: () => Promise<void>;
  engine: SyncEngine | null;
}) {
  const [minimum, setMinimum] = useState(String(data.alliance.minimum)),
    [goal, setGoal] = useState(String(data.alliance.goal)),
    [name, setName] = useState(data.alliance.name),
    [lead, setLead] = useState(data.preferences.leadMinutes),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [preview, setPreview] = useState<ReturnType<typeof readBackup> | null>(null),
    [credentials, setCredentials] = useState<SyncCredentials | null>(null),
    [remoteConsent, setRemoteConsent] = useState(false),
    [code, setCode] = useState(''),
    [qr, setQr] = useState(''),
    [requests, setRequests] = useState<JoinRequest[]>([]),
    [join, setJoin] = useState<{
      requestId: string;
      claimSecret: string;
      verification: string;
      deviceToken: string;
      deviceId: string;
    } | null>(null),
    [joined, setJoined] = useState<SyncCredentials | null>(null),
    [reminder, setReminder] = useState<Reminder | null>(null),
    [conflicts, setConflicts] = useState<Conflict[]>([]),
    [devices, setDevices] = useState<{ id: string; label: string; revoked: number }[]>([]),
    [permission, setPermission] = useState(
      typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
    ),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState('');
  const refresh = async () => {
    setCredentials((await readLocal<SyncCredentials>('sync')) ?? null);
    setReminder((await readLocal<Reminder>('reminder')) ?? null);
    setConflicts(await db.conflicts.toArray());
  };
  useEffect(() => {
    void refresh();
  }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!join) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      api<{ pending: boolean } & SyncCredentials>('/join/claim', join)
        .then((result) => {
          if (!result.pending) {
            setJoined(result);
            setJoin(null);
          }
        })
        .catch((e) => {
          setError((e as Error).message);
          setJoin(null);
        });
    }, 5000);
    return () => clearInterval(timer);
  }, [join]);
  const hasLateReminder = Date.now() > Date.parse(nextReset()) - lead * 60000;
  return (
    <>
      <div className={s.titleRow}>
        <div>
          <h1>Settings</h1>
          <p>Your data. The devices you choose.</p>
        </div>
      </div>
      {error && (
        <div role="alert">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {message && (
        <p role="status" className={s.success}>
          {message}
        </p>
      )}
      <section className={s.settingsSection}>
        <div>
          <h2>Alliance and minimums</h2>
          <p>New values apply to future weeks. History keeps its original minimums.</p>
        </div>
        <form
          className={s.panel}
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await commit(
                change(data, 'alliance', 'Alliance settings updated', (draft) => {
                  draft.alliance = {
                    ...draft.alliance,
                    name,
                    minimum: Number(minimum),
                    goal: Number(goal),
                  };
                }),
              );
              setMessage('Settings saved.');
            });
          }}
        >
          <Field label="Alliance name">
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className={s.formGrid}>
            <Field label="Minimum per player">
              <input
                type="number"
                required
                min="0"
                step="1"
                value={minimum}
                onChange={(e) => setMinimum(e.target.value)}
              />
            </Field>
            <Field label="Alliance target">
              <input
                type="number"
                required
                min="0"
                step="1"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </Field>
          </div>
          <button disabled={busy} className={s.primary}>
            Save settings
          </button>
        </form>
      </section>
      <section className={s.settingsSection}>
        <div>
          <h2>Backup and transfer</h2>
          <p>
            Save all your data to a file or transfer it to another device. Files are read locally.
          </p>
          <p>A backup is not a permanent link between devices.</p>
        </div>
        <div className={s.panel}>
          <div className={s.actions}>
            <button
              onClick={() =>
                run(async () => {
                  downloadText(
                    exportBackup(data),
                    'alliance-' + new Date().toISOString().slice(0, 10) + '.json',
                  );
                  await writeLocal('last-export', new Date().toISOString());
                  setMessage('File ready to save.');
                })
              }
            >
              <Download size={16} /> Export all data
            </button>
            <label className={s.fileButton}>
              <Upload size={16} /> Import file
              <input
                type="file"
                accept=".json,application/json"
                className={s.srOnly}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void run(async () => {
                      setPreview(readBackup(await file.text()));
                    });
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <p>
            Includes previous names, exemption reasons, collections, pending rows and revisions.
          </p>
          <p>Clearing browser data can delete your history. Keep a backup in a private location.</p>
          <TransferDates updated={message + data.updatedAt} dataUpdatedAt={data.updatedAt} />
          <details>
            <summary>Recover the previous copy on this device</summary>
            <p>Replacing data keeps the previous copy on this device.</p>
            <button
              onClick={() =>
                run(async () => {
                  const previous = await readLocal<Dataset>('previous-dataset');
                  if (!previous) throw new Error('There is no previous copy on this device.');
                  setPreview(readBackup(exportBackup(previous)));
                })
              }
            >
              Review previous copy
            </button>
          </details>
        </div>
      </section>
      <section className={s.settingsSection}>
        <div>
          <h2>Linked devices</h2>
          <p>Optional. Sync keeps a private copy on the service to update your devices.</p>
          <p>Reminders do not require this link.</p>
        </div>
        <div className={s.panel}>
          {!credentials ? (
            <>
              <Notice>
                Your history is only on this device. Enabling sync sends the tables to your private
                space.
              </Notice>
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={remoteConsent}
                  onChange={(e) => setRemoteConsent(e.target.checked)}
                />{' '}
                I want to enable a private copy and link devices
              </label>
              <button
                disabled={!remoteConsent || busy}
                className={s.primary}
                onClick={() =>
                  run(async () => {
                    const result = await enableSync(data);
                    setCredentials(result);
                    setMessage('Sync enabled. Keep your recovery key in a private location.');
                  })
                }
              >
                <Link2 size={16} /> Enable sync
              </button>
              <details>
                <summary>I have an invitation from another device</summary>
                <Field label="Temporary invitation">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <button
                  disabled={!code.trim() || busy || !!join}
                  onClick={() =>
                    run(async () => {
                      const result = await api<{
                        requestId: string;
                        claimSecret: string;
                        verification: string;
                      }>('/join', { code, label: navigator.platform || 'New device' });
                      setJoin({
                        ...result,
                        deviceToken: deviceSecret(),
                        deviceId: crypto.randomUUID(),
                      });
                    })
                  }
                >
                  Request a link
                </button>
                {join && (
                  <Notice>
                    Confirm code <strong>{join.verification}</strong> on the other device. Wait for
                    approval; this request expires in ten minutes.
                  </Notice>
                )}
              </details>
              <details>
                <summary>Recover with your key</summary>
                <Field label="Space ID and key (space.key)">
                  <input
                    value={recovery}
                    onChange={(e) => setRecovery(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <button
                  disabled={busy || !recovery.includes('.')}
                  onClick={() =>
                    run(async () => {
                      const [spaceId, recoveryKey] = recovery.split('.');
                      setJoined(
                        await api<SyncCredentials>('/recover', {
                          spaceId,
                          recoveryKey,
                          label: 'Recovered device',
                        }),
                      );
                    })
                  }
                >
                  Recover link
                </button>
              </details>
            </>
          ) : (
            <>
              <p className={s.success}>Sync is enabled on this device</p>
              <div className={s.actions}>
                <button
                  onClick={() =>
                    run(async () => {
                      await engine?.run(true);
                      await reload();
                      setMessage('Sync cycle finished. Check the status on the overview.');
                    })
                  }
                >
                  <RefreshCw size={16} /> Sync now
                </button>
                <button
                  onClick={() =>
                    run(async () => {
                      const invite = await api<{ code: string }>(
                        '/spaces/' + credentials.spaceId + '/invites',
                        {},
                        credentials.token,
                      );
                      setCode(invite.code);
                      setQr(await QRCode.toDataURL(invite.code, { width: 220, margin: 2 }));
                    })
                  }
                >
                  Create invitation
                </button>
                <button
                  onClick={() =>
                    run(async () => {
                      await disableSync();
                      setCredentials(null);
                      setMessage('Sync disabled. Your local copy has been kept.');
                    })
                  }
                >
                  <Unlink size={16} /> Unlink this device
                </button>
              </div>
              {credentials.recoveryKey && (
                <details>
                  <summary>Show private recovery key</summary>
                  <p>Anyone with this key can access your space. Store it outside the app.</p>
                  <textarea readOnly value={credentials.spaceId + '.' + credentials.recoveryKey} />
                </details>
              )}
              {qr && (
                <div>
                  <img
                    src={qr}
                    width="180"
                    height="180"
                    alt="Temporary invitation to link another device"
                  />
                  <Field label="Invitation (valid for ten minutes)">
                    <textarea readOnly value={code} />
                  </Field>
                </div>
              )}
              <div className={s.actions}>
                <button
                  onClick={() =>
                    run(async () => {
                      const result = await api<{ requests: JoinRequest[] }>(
                        '/spaces/' + credentials.spaceId + '/invites',
                        undefined,
                        credentials.token,
                      );
                      setRequests(result.requests);
                    })
                  }
                >
                  View link requests
                </button>
                <button
                  onClick={() =>
                    run(async () => {
                      const result = await api<{ devices: typeof devices }>(
                        '/spaces/' + credentials.spaceId + '/devices',
                        undefined,
                        credentials.token,
                      );
                      setDevices(result.devices);
                    })
                  }
                >
                  View authorized devices
                </button>
              </div>
              {requests.map((request) => (
                <div className={s.pendingRequest} key={request.id}>
                  <p>
                    {request.label} · Code <strong>{request.verification}</strong>
                  </p>
                  <button
                    onClick={() =>
                      run(async () => {
                        await api(
                          '/spaces/' + credentials.spaceId + '/approve/' + request.id,
                          {},
                          credentials.token,
                        );
                        setRequests(requests.filter((r) => r.id !== request.id));
                        setMessage('Device authorized.');
                      })
                    }
                  >
                    Confirm code and authorize
                  </button>
                </div>
              ))}
              {devices
                .filter((d) => !d.revoked)
                .map((device) => (
                  <div key={device.id} className={s.pendingRequest}>
                    <span>
                      {device.label}
                      {device.id === credentials.deviceId ? ' · this device' : ''}
                    </span>
                    <button
                      onClick={() =>
                        run(async () => {
                          await api(
                            '/spaces/' + credentials.spaceId + '/devices/' + device.id,
                            undefined,
                            credentials.token,
                            'DELETE',
                          );
                          setDevices(devices.filter((d) => d.id !== device.id));
                          if (device.id === credentials.deviceId) await disableSync();
                          setMessage(
                            'Remote access revoked. Previously downloaded data remains on that device.',
                          );
                        })
                      }
                    >
                      Revoke access
                    </button>
                  </div>
                ))}
            </>
          )}
          {conflicts.map((conflict) => (
            <div key={conflict.id} className={s.warning}>
              <h3>Two versions need review</h3>
              <p>Both versions stay in history. Choose which version should be active.</p>
              <details>
                <summary>Compare versions</summary>
                <h4>On this device</h4>
                <ConflictVersion entity={conflict.key} value={conflict.local.value} />
                <h4>Remote</h4>
                <ConflictVersion entity={conflict.key} value={conflict.remote} />
              </details>
              <div className={s.actions}>
                <button
                  onClick={() =>
                    run(async () => {
                      await resolveConflict(conflict, true);
                      await reload();
                      await engine?.run(true);
                    })
                  }
                >
                  Keep this device's version
                </button>
                <button
                  onClick={() =>
                    run(async () => {
                      await resolveConflict(conflict, false);
                      await reload();
                      await engine?.run(true);
                    })
                  }
                >
                  Use remote version
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className={s.settingsSection}>
        <div>
          <h2>Weekly reminders</h2>
          <p>One weekly notification on this device, with the lead time you choose.</p>
          <p>
            Permission:{' '}
            {permission === 'unsupported'
              ? 'Not supported'
              : permission === 'granted'
                ? 'Allowed'
                : permission === 'denied'
                  ? 'Denied'
                  : 'Not requested'}
            .
          </p>
        </div>
        <div className={s.panel}>
          <Field
            label="Lead time in minutes"
            hint="Between 1 and 10,079 minutes before the weekly reset."
          >
            <input
              type="number"
              min="1"
              max="10079"
              step="1"
              value={lead}
              onChange={(e) => setLead(Number(e.target.value))}
            />
          </Field>
          <div className={s.actions}>
            {[5, 15, 30, 60, 120].map((value) => (
              <button key={value} aria-pressed={lead === value} onClick={() => setLead(value)}>
                {value} min
              </button>
            ))}
          </div>
          <p>
            Next weekly reset: {dateTime(nextReset())}. Reminder:{' '}
            {dateTime(new Date(Date.parse(nextReset()) - lead * 60000).toISOString())}.
          </p>
          {hasLateReminder && (
            <Notice tone="warning">
              This week's reminder time has passed. You can request a reminder now; the next
              occurrence will be scheduled.
            </Notice>
          )}
          <div className={s.actions}>
            <button
              disabled={busy || !Number.isInteger(lead) || lead < 1 || lead > 10079}
              className={s.primary}
              onClick={() =>
                run(async () => {
                  if (
                    !('serviceWorker' in navigator) ||
                    !('PushManager' in window) ||
                    typeof Notification === 'undefined'
                  )
                    throw new Error(
                      'This browser does not support notifications. Use the calendar option. On iPhone, install the app on your Home Screen.',
                    );
                  const cfg = await api<{ pushAvailable: boolean; vapidPublicKey: string | null }>(
                    '/config',
                  );
                  if (!cfg.pushAvailable || !cfg.vapidPublicKey)
                    throw new Error(
                      'Reminders are not available on this server yet. You can already use the calendar option.',
                    );
                  const grant = await Notification.requestPermission();
                  setPermission(grant);
                  if (grant !== 'granted')
                    throw new Error(
                      'Permission was not granted. You can enable it in browser settings or use your calendar.',
                    );
                  const registration = await navigator.serviceWorker.register('/sw.js');
                  await navigator.serviceWorker.ready;
                  const bytes = Uint8Array.from(
                    atob(cfg.vapidPublicKey.replaceAll('-', '+').replaceAll('_', '/')),
                    (c) => c.charCodeAt(0),
                  );
                  const subscription =
                    (await registration.pushManager.getSubscription()) ??
                    (await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: bytes,
                    }));
                  if (reminder) {
                    const result = await api<{ nextDue: number; resetAt: string }>(
                      '/reminders',
                      { leadMinutes: lead },
                      reminder.token,
                      'PUT',
                    );
                    await writeLocal('reminder', { ...reminder, ...result });
                  } else {
                    const result = await api<Reminder>('/reminders', {
                      subscription: subscription.toJSON(),
                      leadMinutes: lead,
                    });
                    await writeLocal('reminder', result);
                  }
                  await commit(
                    change(data, 'preferences', 'Reminder lead time updated', (draft) => {
                      draft.preferences.leadMinutes = lead;
                    }),
                  );
                  setMessage('Reminder enabled and schedule confirmed.');
                })
              }
            >
              <Bell size={16} />
              {reminder ? 'Save lead time' : 'Enable on this device'}
            </button>
            {reminder && (
              <>
                <button
                  onClick={() =>
                    run(async () => {
                      await api('/reminders/test', {}, reminder.token);
                      setMessage('Send requested. Confirm receipt on this device.');
                    })
                  }
                >
                  {hasLateReminder ? 'Remind me now' : 'Send test notification'}
                </button>
                <button
                  onClick={() =>
                    run(async () => {
                      await api('/reminders', undefined, reminder.token, 'DELETE');
                      await db.entries.delete('reminder');
                      const registration = await navigator.serviceWorker.getRegistration();
                      await (await registration?.pushManager.getSubscription())?.unsubscribe();
                      setReminder(null);
                      setMessage('Reminders disabled on this device.');
                    })
                  }
                >
                  Disable reminders
                </button>
              </>
            )}
          </div>
          {reminder && (
            <p>
              Scheduled for {dateTime(new Date(reminder.nextDue).toISOString())}. Delivery depends
              on connectivity and the operating system.
            </p>
          )}
          <h3>Calendar option</h3>
          <p>
            Import the file into your calendar and confirm the alert. Your calendar handles the
            weekly reminders.
          </p>
          <button
            onClick={() =>
              run(async () => {
                downloadText(
                  calendarFile(lead, nextReset()),
                  'alliance-reminder.ics',
                  'text/calendar',
                );
                await commit(
                  change(data, 'preferences', 'Calendar lead time updated', (draft) => {
                    draft.preferences.leadMinutes = lead;
                  }),
                );
                setMessage('Reminder ready. Confirm the import and alert in your calendar.');
              })
            }
          >
            <CalendarDays size={16} /> Export calendar reminder
          </button>
          <p>
            If you change the lead time, remove or replace the old event to avoid duplicates.
            Recording scores does not cancel the calendar reminder.
          </p>
        </div>
      </section>
      {preview && (
        <Modal title="Review import" onClose={() => setPreview(null)}>
          <h3>{preview.dataset.alliance.name}</h3>
          <p>
            {preview.dataset.players.length} players · {preview.dataset.weeks.length} weeks ·{' '}
            {preview.dataset.revisions.length} revisions
          </p>
          <p>Exported: {dateTime(preview.exportedAt)}</p>
          <Notice tone="warning">
            This replaces the data on this device. Export your current copy first. Sync will be
            disabled.
          </Notice>
          <footer>
            <button onClick={() => downloadText(exportBackup(data), 'alliance-before-import.json')}>
              Export current copy
            </button>
            <button onClick={() => setPreview(null)}>Cancel</button>
            <button
              className={s.primary}
              onClick={() =>
                run(async () => {
                  await replaceDataset(preview.dataset);
                  await reload();
                  setPreview(null);
                  setMessage("Data imported. Reminders keep this device's own permission.");
                })
              }
            >
              Confirm replacement
            </button>
          </footer>
        </Modal>
      )}
      {joined && (
        <Modal title="Confirm the other device's data" onClose={() => setJoined(null)}>
          <p>
            The link was authorized. Remote data will replace local data; your current data will be
            kept as this device's previous copy.
          </p>
          <footer>
            <button
              onClick={() => downloadText(exportBackup(data), 'alliance-before-linking.json')}
            >
              Export current copy
            </button>
            <button onClick={() => setJoined(null)}>Cancel</button>
            <button
              className={s.primary}
              onClick={() =>
                run(async () => {
                  await joinSnapshot(joined);
                  await reload();
                  setJoined(null);
                  setCredentials(joined);
                  setMessage('Device linked and history received.');
                })
              }
            >
              Confirm and receive history
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
function TransferDates({ updated, dataUpdatedAt }: { updated: string; dataUpdatedAt: string }) {
  const [values, setValues] = useState<{ exported?: string; imported?: string }>({});
  useEffect(() => {
    void Promise.all([readLocal<string>('last-export'), readLocal<string>('last-import')]).then(
      ([exported, imported]) => setValues({ exported, imported }),
    );
  }, [updated]);
  return (
    <small>
      Last export: {values.exported ? dateTime(values.exported) : 'Not recorded yet'}
      <br />
      Last import: {values.imported ? dateTime(values.imported) : 'Not recorded yet'}
      {values.exported && dataUpdatedAt > values.exported && (
        <>
          <br />
          There are changes since the last export.
        </>
      )}
    </small>
  );
}

function ConflictVersion({ entity, value }: { entity: string; value: unknown }) {
  if (entity === 'alliance') {
    const result = allianceSchema.safeParse(value);
    if (!result.success) return <p>Version unavailable.</p>;
    return (
      <p>
        {result.data.name}
        <br />
        Minimum: {number(result.data.minimum)} · Target: {number(result.data.goal)}
      </p>
    );
  }
  if (entity === 'preferences') {
    const result = preferencesSchema.safeParse(value);
    if (!result.success) return <p>Version unavailable.</p>;
    return <p>Lead time: {result.data.leadMinutes} minutes.</p>;
  }
  if (entity.startsWith('player/')) {
    const result = playerSchema.safeParse(value);
    if (!result.success) return <p>Version unavailable.</p>;
    const player = result.data;
    return (
      <div>
        <p>
          <strong>{player.name}</strong> · {player.social || 'No social contact'}
        </p>
        <p>Previous names: {player.aliases.map((a) => a.name).join(', ') || 'None'}</p>
        <ul>
          {player.memberships.map((m) => (
            <li key={m.id}>
              {dateTime(m.joinedAt)} → {m.leftAt ? dateTime(m.leftAt) : 'Present'}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const result = weekSchema.safeParse(value);
  if (!result.success) return <p>Version unavailable.</p>;
  const week = result.data;
  return (
    <div>
      <p>
        {weekLabel(week)} · Minimum {number(week.minimum)} ·{' '}
        {week.status === 'validated' ? 'Validated' : 'Draft'}
      </p>
      <div className={s.tableScroll}>
        <table>
          <thead>
            <tr>
              <th>Observed name</th>
              <th className={s.numeric}>Points</th>
              <th>Exemption</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(week.results).map(([id, result]) => (
              <tr key={id}>
                <td>{result.observedName}</td>
                <td className={s.numeric}>{number(result.points)}</td>
                <td>{week.exemptions[id]?.reason ?? 'No exemption'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
