import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Menu,
  X,
  Heart,
  ArrowRight,
  Layers3,
  History,
  Users,
  SlidersHorizontal,
  LayoutGrid,
  ClipboardList,
} from 'lucide-react';
import { newDataset } from './domain/model';
import { weekLabel, dateTime, nextReset, weekBounds } from './domain/weeks';
import { useAlliance } from './ui/useAlliance';
const Overview = lazy(() => import('./ui/Overview'));
const Players = lazy(() => import('./ui/Players'));
const WeekEditor = lazy(() => import('./ui/WeekEditor'));
const Settings = lazy(() => import('./ui/Settings'));
import { Modal, Field, Notice, number } from './ui/Modal';
import s from './ui/ui.module.css';
import { readBackup, downloadText } from './domain/transfer';
import { replaceDataset, readLocal } from './data/store';
export default function App() {
  const [displayClock, setDisplayClock] = useState(Date.now());
  const displayWeek = weekBounds(displayClock).id;
  useEffect(() => {
    const refresh = () => setDisplayClock(Date.now());
    const minute = setInterval(refresh, 60000);
    const boundary = setTimeout(refresh, Math.max(1, Date.parse(nextReset()) - Date.now() + 20));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(minute);
      clearTimeout(boundary);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [displayWeek]);
  const alliance = useAlliance();
  const { data, loading, error, commit, reload, syncStatus } = alliance;
  const [route, setRoute] = useState(location.hash.slice(1) || 'overview'),
    [menu, setMenu] = useState(false),
    [name, setName] = useState(''),
    [minimum, setMinimum] = useState('2700'),
    [goal, setGoal] = useState('80000');
  const navigate = (value: string) => {
    location.hash = value;
    setMenu(false);
  };
  useEffect(() => {
    const update = () => setRoute(location.hash.slice(1) || 'overview');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const [initialImport, setInitialImport] = useState<ReturnType<typeof readBackup> | null>(null);
  const rawPage = route.split('?')[0];
  const legacyRoutes: Record<string, string> = {
    inicio: 'overview',
    registo: 'week',
    jogadores: 'players',
    historico: 'history',
    definicoes: 'settings',
  };
  const page = legacyRoutes[rawPage] ?? rawPage,
    week = new URLSearchParams(route.split('?')[1] ?? '').get('week') ?? undefined;
  const destinations = [
    ['overview', 'Overview', LayoutGrid],
    ['week', 'Record scores', ClipboardList],
    ['players', 'Players', Users],
    ['history', 'History', History],
    ['settings', 'Settings', SlidersHorizontal],
  ] as const;
  const support =
    (import.meta.env.VITE_SUPPORT_URL as string | undefined) ?? 'https://ko-fi.com/tequilasunsett';
  return (
    <div className={s.app}>
      <a
        href="#main"
        className={s.skipLink}
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className={s.header}>
        <a className={s.brand} href="#overview">
          <Layers3 size={25} strokeWidth={1.5} />
          <span>
            Alliance<small>Marvel Snap</small>
          </span>
        </a>
        <nav aria-label="Main navigation" className={menu ? s.navOpen : s.nav}>
          {destinations.map(([id, label, Icon]) => (
            <a
              href={'#' + id}
              key={id}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={15} />
              {label}
            </a>
          ))}
        </nav>
        <div className={s.headerActions}>
          {support && /^https:\/\//.test(support) ? (
            <a
              href={support}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support the project"
              className={s.support}
            >
              <Heart size={15} />
              <span>Support the project</span>
            </a>
          ) : (
            <button
              aria-label="Support the project"
              className={s.support}
              onClick={() => alliance.setError('Project support will be available soon.')}
            >
              <Heart size={15} />
              <span>Support the project</span>
            </button>
          )}
          <button
            aria-label={menu ? 'Close menu' : 'Open menu'}
            aria-expanded={menu}
            className={s.menuButton}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={s.main}>
        {error && (
          <div role="alert">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        <Suspense
          fallback={
            <div className={s.loading}>
              <p>Opening page…</p>
            </div>
          }
        >
          {loading ? (
            <div className={s.loading}>
              <h1>Opening dashboard</h1>
              <p>Reading data from this device…</p>
            </div>
          ) : alliance.storageFailure ? (
            <section className={s.panel}>
              <h1>Recover stored data</h1>
              <p>
                The app will not replace data it cannot read. Export the original data first, or
                choose a valid backup.
              </p>
              <div className={s.actions}>
                <button
                  onClick={() => {
                    void readLocal('dataset').then((raw) =>
                      downloadText(JSON.stringify(raw, null, 2), 'original-data-for-recovery.json'),
                    );
                  }}
                >
                  Export original data
                </button>
                <label className={s.fileButton}>
                  Import a valid backup
                  <input
                    type="file"
                    accept=".json"
                    className={s.srOnly}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void file
                          .text()
                          .then((text) => setInitialImport(readBackup(text)))
                          .catch((err) => alliance.setError((err as Error).message));
                    }}
                  />
                </label>
              </div>
            </section>
          ) : !data ? (
            <div className={s.setup}>
              <div>
                <div className={s.setupMark}>
                  <Layers3 size={38} strokeWidth={1.25} />
                </div>
                <h1>
                  Your alliance,
                  <br />
                  week by week.
                </h1>
                <p>Save weekly scores and keep player history when names change.</p>
                <div className={s.setupFacts}>
                  <p>
                    <strong>Review weekly contributions</strong>
                    <span>See scores and repeated missed minimums across previous weeks.</span>
                  </p>
                  <p>
                    <strong>Your history stays private</strong>
                    <span>No account required. Transfer your history with a file.</span>
                  </p>
                </div>
              </div>
              <form
                className={s.panel}
                onSubmit={(e) => {
                  e.preventDefault();
                  void commit(newDataset(name, Number(minimum), Number(goal))).catch(() => {});
                }}
              >
                <h2>Set up your dashboard</h2>
                <Field label="Alliance name">
                  <input
                    required
                    autoFocus
                    maxLength={100}
                    placeholder="Your alliance name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <div className={s.formGrid}>
                  <Field label="Minimum per player">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={minimum}
                      onChange={(e) => setMinimum(e.target.value)}
                    />
                  </Field>
                  <Field label="Weekly target">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    />
                  </Field>
                </div>
                <button className={s.primary} disabled={!name.trim()}>
                  Start <ArrowRight size={16} />
                </button>
                <small>You can change these values in settings.</small>
                <label className={s.fileButton} style={{ marginTop: 20 }}>
                  Already have a backup? Import data
                  <input
                    className={s.srOnly}
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void file
                          .text()
                          .then((text) => setInitialImport(readBackup(text)))
                          .catch((err) => alliance.setError((err as Error).message));
                    }}
                  />
                </label>
              </form>
            </div>
          ) : page === 'players' ? (
            <Players data={data} commit={commit} />
          ) : page === 'week' ? (
            <WeekEditor key={week ?? 'current'} data={data} commit={commit} initialWeek={week} />
          ) : page === 'settings' ? (
            <Settings
              data={data}
              commit={commit}
              reload={reload}
              engine={alliance.engine.current}
            />
          ) : page === 'history' ? (
            <>
              <div className={s.titleRow}>
                <div>
                  <h1>Weekly history</h1>
                  <p>Every saved week, with its original minimum and collection details.</p>
                </div>
                <button className={s.primary} onClick={() => navigate('week')}>
                  Record scores
                </button>
              </div>
              <section className={s.panel}>
                {data.weeks.length ? (
                  <div className={s.historyList}>
                    {data.weeks
                      .slice()
                      .sort((a, b) => b.start.localeCompare(a.start))
                      .map((w) => (
                        <button
                          key={w.id}
                          onClick={() => navigate('week?week=' + encodeURIComponent(w.id))}
                        >
                          <span>
                            <strong>{weekLabel(w)}</strong>
                            <small>
                              {w.status === 'draft' ? 'Draft' : 'Validated'}
                              {w.incomplete ? ' · Incomplete' : ''} · minimum {number(w.minimum)}
                            </small>
                          </span>
                          <span>
                            <strong>
                              {number(
                                Object.values(w.results).reduce(
                                  (sum, r) => sum + (r.points ?? 0),
                                  0,
                                ),
                              )}{' '}
                              points
                            </strong>
                            <small>
                              {w.collections.length} collections · {Object.keys(w.results).length}{' '}
                              results
                            </small>
                          </span>
                          <ArrowRight size={17} />
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className={s.empty}>
                    <History size={28} />
                    <h2>No saved weeks yet</h2>
                    <p>Start with your alliance's points table.</p>
                    <button onClick={() => navigate('week')}>Record your first week</button>
                  </div>
                )}
              </section>
            </>
          ) : (
            <Overview data={data} navigate={navigate} syncStatus={syncStatus} />
          )}
        </Suspense>
      </main>
      {initialImport && (
        <Modal title="Import history" onClose={() => setInitialImport(null)}>
          <h3>{initialImport.dataset.alliance.name}</h3>
          <p>
            {initialImport.dataset.players.length} players · {initialImport.dataset.weeks.length}{' '}
            weeks
          </p>
          <p>The file is read on this device. Importing does not enable sync or notifications.</p>
          <footer>
            <button onClick={() => setInitialImport(null)}>Cancel</button>
            <button
              className={s.primary}
              onClick={() => {
                void replaceDataset(initialImport.dataset)
                  .then(reload)
                  .then(() => setInitialImport(null))
                  .catch((err) => alliance.setError((err as Error).message));
              }}
            >
              Confirm import
            </button>
          </footer>
        </Modal>
      )}
      <footer className={s.appFooter}>
        <span>Alliance · An independent tool for Marvel Snap alliance managers.</span>
        <span>Private player history.</span>
      </footer>
    </div>
  );
}
