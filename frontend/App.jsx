import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, BriefcaseBusiness, Building2, CheckCircle2, ClipboardList, Download, FileText, Filter, Moon, Plus, Search, Share, ShieldCheck, Smartphone, Sparkles, Sun, UploadCloud, X } from 'lucide-react';
import { apiRequest, mapLicitation } from './src/services/api.js';
import './src/responsive.css';

const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validatePassword = (value) => value.trim().length >= 6;
const validateRif = (value) => /^[JEVGCP]-\d{8}-\d$/i.test(value.trim());
const statusClassName = (status) => status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
const bidStatusLabel = (status) => {
  const normalizedStatus = String(status || 'submitted').trim().toLowerCase().replace(/[_-]+/g, ' ');
  const labels = {
    submitted: 'Enviada',
    pending: 'Pendiente',
    'in review': 'En revisión',
    reviewing: 'En revisión',
    approved: 'Aprobada',
    awarded: 'Adjudicada',
    rejected: 'Rechazada',
  };

  return labels[normalizedStatus] || status || 'Enviada';
};
const APP_STATE_KEY = 'licitaciones-vzla-app-state';
const APP_THEME_KEY = 'licitaciones-vzla-theme';
const INSTALL_PROMPT_DISMISSED_KEY = 'licitaciones-vzla-install-dismissed';
const PRIMARY_SECTOR_FILTERS = ['Infraestructura', 'Salud', 'Construcción', 'Tecnología'];

function getInstitutionLogo(organization) {
  const normalizedName = organization.toLocaleLowerCase('es');
  const logoFiles = [
    { match: 'pdvsa', file: 'PDVSA-Logo.wine.png' },
    { match: 'salud', file: 'Ministerio del Poder Popular para la Salud (MPPS).jpg' },
    { match: 'metro de caracas', file: 'Metro de caracas.jpg' },
    { match: 'cantv', file: 'Cantv_logo.png' },
    { match: 'alimentaci', file: 'ministerio-del-poder-popular-para-la-alimentacion-logo-png_seeklogo-246331.png' },
  ];
  const logo = logoFiles.find(({ match }) => normalizedName.includes(match));

  return logo ? `/institutions/${encodeURIComponent(logo.file).replace(/%2F/g, '/')}` : null;
}

function InstitutionLogo({ organization }) {
  const logo = getInstitutionLogo(organization);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="institution-logo" aria-hidden="true">
      {logo && !imageFailed
        ? <img src={logo} alt="" onError={() => setImageFailed(true)} />
        : <Building2 size={17} />}
    </span>
  );
}

function readPreferredTheme() {
  try {
    return localStorage.getItem(APP_THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.error('No se pudo leer la preferencia de tema.', error);
    return 'light';
  }
}

function readPersistedAppState() {
  try {
    const storedState = localStorage.getItem(APP_STATE_KEY) || sessionStorage.getItem(APP_STATE_KEY);
    if (!storedState) {
      return { screen: 'login', session: null, selectedLicitacion: null, activeTab: 'home' };
    }

    const parsedState = JSON.parse(storedState);
    const session = typeof parsedState.session?.token === 'string' ? parsedState.session : null;
    const validScreens = ['login', 'register', 'home', 'detail', 'apply'];
    let screen = validScreens.includes(parsedState.screen) ? parsedState.screen : 'login';
    const validTabs = ['home', 'metrics', 'applications'];
    const selectedLicitacion = typeof parsedState.selectedLicitacion?.id === 'string'
      ? parsedState.selectedLicitacion
      : null;

    if (['home', 'detail', 'apply'].includes(screen) && !session) screen = 'login';
    if (['detail', 'apply'].includes(screen) && !selectedLicitacion) screen = 'home';

    return {
      screen,
      session,
      selectedLicitacion,
      activeTab: validTabs.includes(parsedState.activeTab) ? parsedState.activeTab : 'home',
    };
  } catch (error) {
    console.error('No se pudo restaurar el estado guardado de la aplicación.', error);
    return { screen: 'login', session: null, selectedLicitacion: null, activeTab: 'home' };
  }
}

function ThemeToggle({ theme, onToggleTheme }) {
  const Icon = theme === 'light' ? Moon : Sun;
  const nextTheme = theme === 'light' ? 'oscuro' : 'claro';

  return (
    <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Cambiar a modo ${nextTheme}`} title={`Cambiar a modo ${nextTheme}`}>
      <Icon size={17} aria-hidden="true" />
      <span>{theme === 'light' ? 'Oscuro' : 'Claro'}</span>
    </button>
  );
}

function getAuthenticatedDisplayName(session) {
  const candidates = [
    session.razonSocial,
    session.name,
    session.fullName,
    session.username,
    session.userName,
    session.email?.split('@')[0],
  ];

  const placeholderValues = new Set(['vista previa', 'preview', 'empresa', 'usuario', 'cuenta autenticada']);
  return candidates.find((value) => (
    typeof value === 'string'
    && value.trim()
    && !placeholderValues.has(value.trim().toLocaleLowerCase('es'))
  ))?.trim() || 'Nombre no disponible';
}

function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [installError, setInstallError] = useState('');
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === 'true';
    } catch (error) {
      console.error('No se pudo leer el estado de la invitación de instalación.', error);
      return false;
    }
  });
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstructionsOpen(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const dismissBanner = () => {
    try {
      sessionStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    } catch (error) {
      console.error('No se pudo guardar el cierre de la invitación de instalación.', error);
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    setInstructionsOpen(true);
    if (!deferredPrompt) return;

    const promptEvent = deferredPrompt;
    setDeferredPrompt(null);
    setInstallError('');

    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (error) {
      console.error('No se pudo iniciar la instalación de la PWA.', error);
      setInstallError('No se pudo abrir la instalación automática. Sigue los pasos para agregar la app desde el menú del navegador.');
    }
  };

  if (dismissed || installed) return null;

  return (
    <aside className="install-pwa" aria-label="Instalar aplicación móvil">
      <div className="install-pwa__banner">
        <div className="install-pwa__identity">
          <span className="install-pwa__icon"><Smartphone size={17} aria-hidden="true" /></span>
          <span className="install-pwa__copy">
            <strong>Instalar App Móvil PWA</strong>
            <small>Acceso rápido sin tiendas de apps</small>
          </span>
        </div>
        <div className="install-pwa__actions">
          <button className="install-pwa__install" type="button" onClick={handleInstall}>Instalar</button>
          <button className="install-pwa__close" type="button" onClick={dismissBanner} aria-label="Cerrar invitación de instalación" title="Cerrar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {instructionsOpen && (
        <div className="install-pwa__instructions">
          <div className="install-pwa__instructions-heading">
            <strong>Pasos para instalar en tu celular:</strong>
            <button className="install-pwa__close" type="button" onClick={() => setInstructionsOpen(false)} aria-label="Cerrar instrucciones" title="Cerrar instrucciones">
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="install-pwa__steps">
            <div>
              <strong><Share size={12} aria-hidden="true" /> En iOS (Safari):</strong>
              <span>1. Toca “Compartir”.</span>
              <span>2. “Agregar a inicio”.</span>
            </div>
            <div>
              <strong><Plus size={12} aria-hidden="true" /> En Android (Chrome):</strong>
              <span>1. Menú (⋮)</span>
              <span>2. “Instalar aplicación” o “Agregar a pantalla principal”.</span>
            </div>
          </div>
          {installError && <p className="install-pwa__error" role="status">{installError}</p>}
        </div>
      )}
    </aside>
  );
}

function getTenderAttachment(attachment) {
  if (typeof attachment === 'string') {
    const value = attachment.trim();
    return { name: value.split(/[\\/]/).pop() || value, url: /^https?:\/\/|^\//i.test(value) ? value : null };
  }

  if (!attachment || typeof attachment !== 'object') return null;

  const name = attachment.name || attachment.filename || attachment.fileName || attachment.url || '';
  const url = attachment.url || attachment.href || '';
  if (typeof name !== 'string' || !name.trim()) return null;

  return {
    name: name.split(/[\\/]/).pop(),
    url: typeof url === 'string' && (/^https?:\/\/|^\//i.test(url)) ? url : null,
  };
}

function LoginScreen({ onLogin, onGoToRegister, theme, onToggleTheme }) {
  const [rif, setRif] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Completa todos los campos para continuar.');
      return;
    }

    if (!validateEmail(email)) {
      alert('Correo inválido');
      return;
    }

    if (!validatePassword(password)) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (rif && !validateRif(rif)) {
      alert('RIF inválido');
      return;
    }

    setIsChecking(true);

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (rif && result.company.rif.toUpperCase() !== rif.trim().toUpperCase()) {
        throw new Error('El RIF no coincide con la cuenta.');
      }

      onLogin({ ...result.company, token: result.token });
    } catch (error) {
      alert(error.message || 'No se pudo iniciar sesión');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="app-screen auth-screen" style={styles.screen}>
      <div style={styles.contentCenter}>
        <div className="auth-toolbar"><ThemeToggle theme={theme} onToggleTheme={onToggleTheme} /></div>
        <div style={styles.logoBox}><ShieldCheck size={28} color="var(--text-accent)" /></div>
        <div style={styles.eyebrow}>Acceso empresarial</div>
        <h1 style={styles.heroTitle}>Licitaciones VZLA</h1>
        <div style={styles.heroSubtitle}>Gestiona postulaciones públicas y privadas desde tu navegador.</div>

        <div style={styles.formCard}>
          <label style={styles.label}>Correo corporativo</label>
          <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="empresa@correo.com" />

          <label style={styles.label}>Contraseña</label>
          <div style={styles.passwordWrap}>
            <input type={showPassword ? 'text' : 'password'} style={styles.passwordInput} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} style={styles.showPasswordButton}>{showPassword ? 'Ocultar' : 'Ver'}</button>
          </div>

          <label style={styles.label}>RIF</label>
          <input style={styles.input} value={rif} onChange={(e) => setRif(e.target.value)} placeholder="J-00000000-9" />

          <button type="button" style={{ ...styles.primaryButton, ...(isChecking ? styles.primaryButtonDisabled : {}) }} onClick={handleLogin} disabled={isChecking}>
            {isChecking ? 'Validando...' : 'Iniciar sesión'}
          </button>

          <button type="button" onClick={onGoToRegister} style={styles.footerLinkButton}>Crear cuenta de empresa</button>
        </div>
      </div>
    </div>
  );
}

function RegisterScreen({ onRegister, onBack, theme, onToggleTheme }) {
  const [razonSocial, setRazonSocial] = useState('');
  const [rif, setRif] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!razonSocial.trim() || !rif.trim() || !email.trim() || !password) {
      alert('Completa razón social, RIF, correo y contraseña.');
      return;
    }

    if (!validateRif(rif)) {
      alert('RIF inválido. Ejemplo: J-00000000-9');
      return;
    }

    if (!validateEmail(email) || !validatePassword(password)) {
      alert('Verifica el correo y la contraseña.');
      return;
    }

    setIsRegistering(true);

    try {
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          razonSocial: razonSocial.trim(),
          rif: rif.trim().toUpperCase(),
          email: email.trim(),
          password,
          telefono: telefono.trim() || undefined,
        }),
      });

      onRegister({ ...result.company, token: result.token });
    } catch (error) {
      alert(error.message || 'No se pudo crear la cuenta');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="app-screen auth-screen" style={styles.screen}>
      <div style={styles.contentCenter}>
        <div className="auth-toolbar"><ThemeToggle theme={theme} onToggleTheme={onToggleTheme} /></div>
        <div style={styles.logoBox}><ShieldCheck size={28} color="var(--text-accent)" /></div>
        <div style={styles.eyebrow}>Registro empresarial</div>
        <h1 style={styles.heroTitle}>Crear cuenta</h1>

        <div style={styles.formCard}>
          <label style={styles.label}>Razón social</label>
          <input style={styles.input} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />

          <label style={styles.label}>RIF</label>
          <input style={styles.input} value={rif} onChange={(e) => setRif(e.target.value)} placeholder="J-00000000-9" />

          <label style={styles.label}>Correo corporativo</label>
          <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />

          <label style={styles.label}>Teléfono (opcional)</label>
          <input style={styles.input} value={telefono} onChange={(e) => setTelefono(e.target.value)} />

          <label style={styles.label}>Contraseña</label>
          <input type="password" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />

          <button type="button" style={{ ...styles.primaryButton, ...(isRegistering ? styles.primaryButtonDisabled : {}) }} onClick={handleRegister} disabled={isRegistering}>
            {isRegistering ? 'Creando cuenta...' : 'Registrarme'}
          </button>

          <button type="button" onClick={onBack} style={styles.footerLinkButton}>Ya tengo una cuenta</button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ session, onLogout, onOpenDetail, activeTab, onChangeTab, theme, onToggleTheme }) {
  const [searchText, setSearchText] = useState('');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todas');
  const accountDisplayName = getAuthenticatedDisplayName(session);
  const [licitaciones, setLicitaciones] = useState([]);
  const [submittedProposals, setSubmittedProposals] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApplications = async () => {
    setApplicationsLoading(true);
    setApplicationsError('');

    try {
      const bids = await apiRequest('/bids/my-bids', { token: session.token });
      if (!Array.isArray(bids)) {
        throw new Error('La API devolvió un historial de postulaciones con formato inesperado.');
      }
      setSubmittedProposals(bids);
    } catch (err) {
      setApplicationsError(err.message || 'No se pudo cargar el historial de postulaciones.');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const licitacionesData = await apiRequest('/licitations');
      setLicitaciones(licitacionesData.map(mapLicitation));
    } catch (err) {
      setError(err.message || 'No se pudo cargar licitaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadApplications();
  }, [session.token]);

  const filtered = useMemo(() => {
    return licitaciones.filter((item) => {
      const query = searchText.toLowerCase();
      const matchesSearch = !query || item.title.toLowerCase().includes(query) || item.organization.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
      const matchesSector = selectedSector === 'Todos' || item.sector === selectedSector;
      const matchesStatus = selectedStatus === 'Todas' || item.status === selectedStatus;
      return matchesSearch && matchesSector && matchesStatus;
    });
  }, [licitaciones, searchText, selectedSector, selectedStatus]);

  const sectorOptions = useMemo(() => {
    const additionalSectors = [...new Set(licitaciones.map((item) => item.sector))]
      .filter((sector) => sector && !PRIMARY_SECTOR_FILTERS.includes(sector))
      .sort((first, second) => first.localeCompare(second, 'es'));

    return ['Todos', ...PRIMARY_SECTOR_FILTERS, ...additionalSectors];
  }, [licitaciones]);

  const metrics = useMemo(() => {
    const sectors = new Map();
    const statuses = new Map();
    let budgetTotal = 0;
    let budgetCount = 0;

    licitaciones.forEach((licitation) => {
      sectors.set(licitation.sector, (sectors.get(licitation.sector) || 0) + 1);
      statuses.set(licitation.status, (statuses.get(licitation.status) || 0) + 1);

      if (Number.isFinite(licitation.budgetAmount) && licitation.budgetAmount > 0) {
        budgetTotal += licitation.budgetAmount;
        budgetCount += 1;
      }
    });

    const getDistribution = (entries) => [...entries.entries()]
      .map(([label, count]) => ({
        label,
        count,
        percentage: licitaciones.length ? Math.round((count / licitaciones.length) * 100) : 0,
      }))
      .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label, 'es'));

    return {
      total: licitaciones.length,
      budgetTotal,
      budgetCount,
      sectors: getDistribution(sectors),
      statuses: getDistribution(statuses),
    };
  }, [licitaciones]);

  const renderCatalog = () => (
    <div style={styles.spaceY}>
      <div className="kpi-grid" style={styles.kpiGrid}>
        <div style={styles.kpiCard}><BriefcaseBusiness size={16} color="var(--text-accent)" /><div style={styles.kpiTextWrap}><div style={styles.kpiLabel}>Licitaciones activas</div><div style={styles.kpiValue}>{licitaciones.length}</div></div></div>
        <div style={styles.kpiCard}><ShieldCheck size={16} color="var(--success-text)" /><div style={styles.kpiTextWrap}><div style={styles.kpiLabel}>Postulaciones</div><div style={styles.kpiValueGreen}>{submittedProposals.length}</div></div></div>
      </div>

      <div className="sector-filter">
        <div className="sector-filter__header">
          <span className="sector-filter__title"><Filter size={13} aria-hidden="true" /> Sector económico</span>
          <span className="sector-filter__count" aria-live="polite">{filtered.length} encontrados</span>
        </div>
        <div className="sector-filter__options" role="group" aria-label="Filtrar por sector económico">
          {sectorOptions.map((sector) => (
            <button
              key={sector}
              className={`sector-filter__option${selectedSector === sector ? ' sector-filter__option--active' : ''}`}
              type="button"
              aria-pressed={selectedSector === sector}
              onClick={() => setSelectedSector(sector)}
            >
              {sector}
            </button>
          ))}
        </div>
        <div className="sector-filter__statuses" role="group" aria-label="Filtrar por estado">
          {['Todas', 'Abierta', 'En evaluación', 'Adjudicada'].map((status) => (
            <button
              key={status}
              className={`sector-filter__status${selectedStatus === status ? ' sector-filter__status--active' : ''}`}
              type="button"
              aria-pressed={selectedStatus === status}
              onClick={() => setSelectedStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="card-list" style={styles.cardList}>
        {error && <div style={styles.emptyState}><div style={styles.emptyTitle}>No se pudo cargar el catálogo</div><div style={styles.emptyText}>{error}</div><button type="button" style={styles.primaryButton} onClick={loadDashboard}>Reintentar</button></div>}
        {loading && !error ? <div style={styles.emptyState}><div style={styles.emptyText}>Cargando licitaciones...</div></div> : null}
        {!loading && filtered.length === 0 && !error ? <div style={styles.emptyState}><div style={styles.emptyTitle}>No hay resultados</div><div style={styles.emptyText}>Prueba con otra palabra clave o cambia los filtros.</div></div> : null}

        {filtered.map((item) => (
          <article key={item.id} className="tender-card" onClick={() => onOpenDetail(item)} role="button" tabIndex={0} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onOpenDetail(item);
            }
          }}>
            <div className="tender-card__header">
              <span className="tender-card__number">N.º {item.id}</span>
              <span className={`tender-card__status tender-card__status--${statusClassName(item.status)}`}>{item.status}</span>
            </div>
            <div className="tender-card__work">
              <span className="tender-card__label">Tipo de trabajo requerido</span>
              <h3 className="tender-card__title">{item.title}</h3>
            </div>
            <div className="tender-card__organization">
              <InstitutionLogo organization={item.organization} />
              <span>{item.organization}</span>
            </div>
            <div className="tender-card__facts">
              <div className="tender-card__fact">
                <span className="tender-card__label">Ubicación</span>
                <span className="tender-card__fact-value">{item.location}</span>
              </div>
              <div className="tender-card__fact tender-card__fact--budget">
                <span className="tender-card__label">Monto base estimado</span>
                <span className="tender-card__fact-value">{item.budget !== 'No especificado' && item.budgetCurrency ? `$${item.budget} ${item.budgetCurrency}` : item.budget}</span>
              </div>
            </div>
            <div className="tender-card__footer">
              <span className="tender-card__deadline">{item.daysLeft === null ? item.deadline : `Cierra en ${item.daysLeft} días (${item.deadline})`}</span>
              <span className="tender-card__link">Ver pliego <span aria-hidden="true">›</span></span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const renderApplications = () => (
    <div style={styles.spaceY}>
      <div style={styles.listHeaderRow}><div style={styles.sectionTitle}>Historial de postulaciones</div><div style={styles.metaText}>{applicationsLoading ? 'Cargando…' : `${submittedProposals.length} enviadas`}</div></div>
      {applicationsLoading && <div style={styles.emptyState}><div style={styles.emptyText}>Cargando historial de postulaciones...</div></div>}
      {!applicationsLoading && applicationsError && <div style={styles.emptyState}><div style={styles.emptyTitle}>No se pudo cargar el historial</div><div style={styles.emptyText}>{applicationsError}</div><button type="button" style={styles.primaryButton} onClick={loadApplications}>Reintentar</button></div>}
      {!applicationsLoading && !applicationsError && submittedProposals.length === 0 ? <div style={styles.emptyState}><div style={styles.emptyText}>Todavía no has enviado postulaciones.</div></div> : null}
      {!applicationsLoading && !applicationsError && submittedProposals.map((app) => (
        <div key={app.id || `${app.licitationId}-${app.submittedAt}`} style={styles.applicationCard}>
          <div style={styles.appHeaderRow}><span style={styles.appId}>{app.id}</span><span style={styles.appStatus}>{bidStatusLabel(app.status)}</span></div>
          <div style={styles.appTitle}>{app.licitationTitle || app.licitationId}</div>
          <div style={styles.appEntity}>Enviada: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('es-VE') : 'Fecha no disponible'}</div>
          <div style={styles.appHashBox}><div style={styles.hashLabel}>Archivo de propuesta</div><div style={styles.hashValueSmall}>{app.pdfUrl || 'Sin referencia disponible'}</div></div>
        </div>
      ))}
    </div>
  );

  const renderMetrics = () => (
    <section className="metrics-dashboard" aria-labelledby="metrics-title">
      <header className="metrics-dashboard__header">
        <h1 id="metrics-title"><BarChart3 size={18} aria-hidden="true" /> Métricas de licitaciones</h1>
        <span>Datos del catálogo</span>
      </header>

      <div className="metrics-dashboard__summary">
        <article className="metrics-summary-card">
          <span>Licitaciones disponibles</span>
          <strong>{metrics.total.toLocaleString('es-VE')}</strong>
          <small>Registros del catálogo cargados</small>
        </article>
        <article className="metrics-summary-card metrics-summary-card--budget">
          <span>Presupuesto referencial</span>
          <strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(metrics.budgetTotal)}</strong>
          <small>{metrics.budgetCount} de {metrics.total} con monto disponible</small>
        </article>
      </div>

      <section className="metrics-panel" aria-labelledby="metrics-sector-title">
        <h2 id="metrics-sector-title">Distribución de licitaciones por sector</h2>
        {loading && metrics.total === 0
          ? <p className="metrics-panel__empty">Cargando datos del catálogo…</p>
          : metrics.sectors.length === 0
            ? <p className="metrics-panel__empty">No hay licitaciones disponibles para calcular esta distribución.</p>
            : <ul className="metrics-bars">
              {metrics.sectors.map((sector, index) => (
                <li className="metrics-bars__item" key={sector.label}>
                  <div className="metrics-bars__label">
                    <span>{sector.label}</span>
                    <strong>{sector.percentage}% <small>({sector.count})</small></strong>
                  </div>
                  <div
                    className="metrics-bars__track"
                    role="progressbar"
                    aria-label={`${sector.label}: ${sector.count} licitaciones`}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={sector.percentage}
                  >
                    <span className={`metrics-bars__fill metrics-bars__fill--${index % 5}`} style={{ width: `${sector.percentage}%` }} />
                  </div>
                </li>
              ))}
            </ul>}
      </section>

      <section className="metrics-panel metrics-panel--statuses" aria-labelledby="metrics-status-title">
        <h2 id="metrics-status-title">Estado de las licitaciones</h2>
        {metrics.statuses.length === 0
          ? <p className="metrics-panel__empty">Los estados se mostrarán cuando el catálogo termine de cargar.</p>
          : <ul className="metrics-statuses">
            {metrics.statuses.map((status) => (
              <li key={status.label}>
                <span>{status.label}</span>
                <strong>{status.count}</strong>
              </li>
            ))}
          </ul>}
      </section>
    </section>
  );

  return (
    <div className="app-screen home-screen" style={styles.screen}>
      <div className="home-header" style={styles.headerBar}>
        <div className="home-header__brand">
          <div className="home-header__logo">LV</div>
          <div className="home-header__brand-copy">
            <div className="home-header__brand-title">
              <span>Licitaciones VZLA</span>
              <span className="home-header__pwa">PWA</span>
            </div>
            <div className="home-header__brand-subtitle">República Bolivariana de Venezuela</div>
          </div>
        </div>
        <div className="home-header__right">
          <div className="home-header__account">
            <span className="home-header__rif">RIF: {session.rif || 'No registrado'}</span>
            <span className="home-header__company" title={accountDisplayName}>
              {accountDisplayName}
            </span>
          </div>
          <div className="home-header__actions">
            <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
            <div className="web-header-chip" style={styles.webHeaderChip}>Online</div>
            <button className="logout-button" type="button" onClick={onLogout} style={styles.logoutButton}>Salir</button>
          </div>
        </div>
      </div>

      <InstallPwaBanner />

      <div className="home-workspace" style={styles.webWorkspace}>
        <aside className="home-sidebar" style={styles.sidebar}>
          <div style={styles.webSidebarCard}><div style={styles.webSidebarLabel}>Resumen</div><div style={styles.webSidebarValue}>{licitaciones.length}</div><div style={styles.webSidebarMeta}>licitaciones disponibles</div></div>
          <div style={styles.webSidebarCard}><div style={styles.webSidebarLabel}>Rif</div><div style={styles.webSidebarValueSmall}>{session.rif || 'Autenticada'}</div><div style={styles.webSidebarMeta}>{session.name || session.razonSocial || 'Empresa'}</div></div>
          <nav className="home-sidebar-actions" aria-label="Navegación principal" style={styles.webSidebarCard}>
            <div style={styles.webSidebarLabel}>Acciones rápidas</div>
            <button className="desktop-nav-button" type="button" aria-current={activeTab === 'home' ? 'page' : undefined} onClick={() => onChangeTab('home')}>
              <BriefcaseBusiness size={18} aria-hidden="true" /><span>Catálogo</span>
            </button>
            <button className="desktop-nav-button" type="button" aria-current={activeTab === 'metrics' ? 'page' : undefined} onClick={() => onChangeTab('metrics')}>
              <BarChart3 size={18} aria-hidden="true" /><span>Métricas</span>
            </button>
            <button className="desktop-nav-button" type="button" aria-current={activeTab === 'applications' ? 'page' : undefined} onClick={() => onChangeTab('applications')}>
              <ClipboardList size={18} aria-hidden="true" /><span>Postulaciones</span>
            </button>
          </nav>
        </aside>

        <main className="home-main" style={styles.mainPane}>
          {activeTab === 'home' && (
            <div style={styles.searchBox}><Search size={16} color="var(--text-muted)" /><input style={styles.searchInput} value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar licitación, entidad o código..." /></div>
          )}
          {activeTab === 'home' && renderCatalog()}
          {activeTab === 'metrics' && renderMetrics()}
          {activeTab === 'applications' && renderApplications()}
        </main>
      </div>
    </div>
  );
}

function DetailScreen({ licitacion, onBack, onApply, session, theme, onToggleTheme }) {
  const isPdvsa = licitacion.organization.toLocaleLowerCase('es').includes('pdvsa');
  const isMpps = licitacion.organization.toLocaleLowerCase('es').includes('mpps')
    || licitacion.organization.toLocaleLowerCase('es').includes('ministerio del poder popular para la salud');
  const isMetro = licitacion.organization.toLocaleLowerCase('es').includes('metro de caracas');
  const isCantv = licitacion.organization.toLocaleLowerCase('es').includes('cantv');
  const isMinal = licitacion.organization.toLocaleLowerCase('es').includes('alimentaci');
  const attachments = licitacion.attachments.map(getTenderAttachment).filter(Boolean);

  return (
    <div className="app-screen detail-screen" style={styles.screen}>
      <div style={styles.detailContent}>
        <div className="detail-toolbar"><button type="button" onClick={onBack} style={styles.backButton}><ArrowLeft size={18} color="var(--text-primary)" /> Volver</button><ThemeToggle theme={theme} onToggleTheme={onToggleTheme} /></div>
        <div className={`detail-card${isPdvsa || isMpps || isMetro || isCantv || isMinal ? ' pdvsa-detail-card' : ''}${isMpps ? ' mpps-detail-card' : ''}${isMetro ? ' metro-detail-card' : ''}${isCantv ? ' cantv-detail-card' : ''}${isMinal ? ' minal-detail-card' : ''}`} style={styles.detailCard}>
          {isPdvsa || isMpps || isMetro || isCantv || isMinal ? (
            <>
              <div className="pdvsa-detail__header">
                <span style={styles.code}>{licitacion.referenceCode}</span>
                <span className={`tender-card__status tender-card__status--${statusClassName(licitacion.status)}`}>{licitacion.status}</span>
              </div>
              <h1 className="pdvsa-detail__title">{licitacion.title}</h1>

              <div className="pdvsa-detail__contractor">
                <InstitutionLogo organization={licitacion.organization} />
                <div className="pdvsa-detail__contractor-copy">
                  <span className="pdvsa-detail__label">Ente contratante</span>
                  <strong>{licitacion.organization}</strong>
                </div>
              </div>

              <div className="pdvsa-detail__facts">
                <div className="pdvsa-detail__fact">
                  <span className="pdvsa-detail__label">Presupuesto referencial</span>
                  <strong className="pdvsa-detail__budget">
                    {licitacion.budgetAmount
                      ? `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(licitacion.budgetAmount)} ${licitacion.budgetCurrency || ''}`.trim()
                      : licitacion.budget}
                  </strong>
                </div>
                <div className="pdvsa-detail__fact">
                  <span className="pdvsa-detail__label">Límite de recepción</span>
                  <strong>{licitacion.receiptLimit}</strong>
                </div>
              </div>

              <section className="pdvsa-detail__section">
                <h2>Descripción de la Contratación</h2>
                <p className="pdvsa-detail__description">{licitacion.description}</p>
              </section>

              <section className="pdvsa-detail__section">
                <h2>Requisitos Legales y Términos</h2>
                {licitacion.requirements.length === 0
                  ? <p className="pdvsa-detail__empty">No se especificaron requisitos adicionales.</p>
                  : <ul className="pdvsa-detail__requirements">
                    {licitacion.requirements.map((requirement) => (
                      <li key={requirement}><CheckCircle2 size={15} aria-hidden="true" /><span>{requirement}</span></li>
                    ))}
                  </ul>}
              </section>

              <section className="pdvsa-detail__section">
                <h2>Descargar Pliegos Oficiales</h2>
                <div className="pdvsa-detail__attachments">
                  {attachments.map((attachment) => (
                    attachment.url
                      ? <a className="pdvsa-detail__attachment" href={attachment.url} key={`${attachment.name}-${attachment.url}`} target="_blank" rel="noreferrer">
                        <FileText size={15} aria-hidden="true" /><span>{attachment.name}</span><Download size={15} aria-hidden="true" />
                      </a>
                      : <div className="pdvsa-detail__attachment pdvsa-detail__attachment--unavailable" key={attachment.name} aria-disabled="true" title="El archivo oficial todavía no se ha cargado">
                        <FileText size={15} aria-hidden="true" /><span>{attachment.name}</span><span className="pdvsa-detail__pending">Pendiente</span>
                      </div>
                  ))}
                </div>
                {attachments.some((attachment) => !attachment.url) && (
                  <p className="pdvsa-detail__notice">Los archivos oficiales estarán disponibles cuando sean cargados.</p>
                )}
              </section>

              <button type="button" style={styles.primaryButton} onClick={() => onApply(licitacion, session)}>
                {(isMpps || isMetro || isCantv || isMinal) && <Sparkles size={16} aria-hidden="true" />}
                {isMpps || isMetro || isCantv || isMinal ? 'Iniciar Postulación Oficial' : 'Postularme'}
              </button>
            </>
          ) : (
            <>
          <div style={styles.cardTop}><span style={styles.code}>{licitacion.id}</span><span className={`tender-card__status tender-card__status--${statusClassName(licitacion.status)}`}>{licitacion.status}</span></div>
          <div style={styles.detailTitle}>{licitacion.title}</div>
          <div style={styles.detailOrg}>{licitacion.organization}</div>
          <div className="detail-grid" style={styles.detailGrid}>
            <div style={styles.detailBox}><div style={styles.infoLabel}>Presupuesto</div><div style={styles.infoValueGreen}>{licitacion.budget}</div></div>
            <div style={styles.detailBox}><div style={styles.infoLabel}>Vence</div><div style={styles.infoValue}>{licitacion.deadline}</div></div>
          </div>

          <div style={styles.sectionTitle}>Descripción</div>
          <div style={styles.paragraph}>{licitacion.description}</div>

          <div style={styles.sectionTitle}>Requisitos</div>
          {licitacion.requirements.length === 0 ? <div style={styles.emptyText}>No se especificaron requisitos adicionales.</div> : licitacion.requirements.map((requirement) => (
            <div key={requirement} style={styles.requirementRow}><CheckCircle2 size={16} color="var(--success-text)" /><span style={styles.requirementText}>{requirement}</span></div>
          ))}

          <button type="button" style={styles.primaryButton} onClick={() => onApply(licitacion, session)}>Postularme</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplyScreen({ licitacion, session, onBack, onSubmit, theme, onToggleTheme }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickPdf = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (file) setSelectedFile(file);
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert('Adjunta tu propuesta en PDF antes de continuar.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('licitation_id', licitacion.id);
      formData.append('file', selectedFile, selectedFile.name);

      await apiRequest('/bids', {
        method: 'POST',
        body: formData,
        token: session.token,
      });

      onSubmit();
    } catch (error) {
      alert(error.message || 'No se pudo enviar la postulación');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-screen detail-screen" style={styles.screen}>
      <div style={styles.detailContent}>
        <div className="detail-toolbar"><button type="button" onClick={onBack} style={styles.backButton}><ArrowLeft size={18} color="var(--text-primary)" /> Cancelar</button><ThemeToggle theme={theme} onToggleTheme={onToggleTheme} /></div>
        <div style={styles.detailCard}>
          <div style={styles.detailTitle}>Formulario de postulación</div>
          <div style={styles.detailOrg}>{licitacion.title}</div>

          <div style={styles.label}>Cargar propuesta técnica y financiera (PDF)</div>
          <button type="button" onClick={pickPdf} style={styles.uploadBox}><UploadCloud size={20} color="var(--text-accent)" /><span>{selectedFile ? selectedFile.name : 'Adjuntar PDF'}</span></button>

          <button type="button" style={{ ...styles.primaryButton, ...(uploading ? styles.primaryButtonDisabled : {}) }} onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Enviando...' : 'Transmitir postulación oficial'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState(readPersistedAppState);
  const [theme, setTheme] = useState(readPreferredTheme);
  const { screen, session, selectedLicitacion, activeTab } = appState;

  const updateAppState = (update) => {
    const nextState = typeof update === 'function' ? update(appState) : update;

    try {
      if (nextState.screen === 'login' && !nextState.session) {
        localStorage.removeItem(APP_STATE_KEY);
      } else {
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(nextState));
      }
    } catch (error) {
      console.error('No se pudo guardar el estado de la aplicación para la próxima recarga.', error);
    }

    setAppState(nextState);
  };

  useEffect(() => {
    try {
      if (screen === 'login' && !session) {
        localStorage.removeItem(APP_STATE_KEY);
        return;
      }

      localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
    } catch (error) {
      console.error('No se pudo guardar el estado de la aplicación para la próxima recarga.', error);
    }
  }, [appState]);

  useEffect(() => {
    try {
      localStorage.setItem(APP_THEME_KEY, theme);
    } catch (error) {
      console.error('No se pudo guardar la preferencia de tema.', error);
    }

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f7fb' : '#020817');
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!session?.token) return undefined;

    let isActive = true;
    const restoredToken = session.token;

    apiRequest('/auth/me', { token: restoredToken }).then((company) => {
      if (isActive) {
        setAppState((current) => current.session?.token === restoredToken
          ? { ...current, session: { ...company, token: restoredToken } }
          : current);
      }
    }).catch((error) => {
      if (!isActive) return;

      if (error.status === 401 || error.status === 403) {
        setAppState((current) => current.session?.token === restoredToken
          ? { ...current, screen: 'login', session: null, selectedLicitacion: null }
          : current);
        alert('Tu sesión venció o ya no es válida. Inicia sesión nuevamente.');
      } else {
        console.error('No se pudo validar la sesión restaurada.', error);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const handleLogin = (company) => {
    updateAppState((current) => ({ ...current, screen: 'home', session: company, selectedLicitacion: null }));
  };

  const handleRegister = (company) => {
    updateAppState((current) => ({ ...current, screen: 'home', session: company, selectedLicitacion: null }));
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(APP_STATE_KEY);
      sessionStorage.removeItem(APP_STATE_KEY);
    } catch (error) {
      console.error('No se pudo borrar el estado guardado al cerrar sesión.', error);
    }
    updateAppState({ screen: 'login', session: null, selectedLicitacion: null, activeTab: 'home' });
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem(APP_THEME_KEY, nextTheme);
    } catch (error) {
      console.error('No se pudo guardar la preferencia de tema.', error);
    }
    setTheme(nextTheme);
  };

  const openDetail = (licitation) => {
    updateAppState((current) => ({ ...current, selectedLicitacion: licitation, screen: 'detail' }));
  };

  const openApply = (licitation) => {
    updateAppState((current) => ({ ...current, selectedLicitacion: licitation, screen: 'apply' }));
  };

  const submitBid = () => {
    updateAppState((current) => ({ ...current, screen: 'home', selectedLicitacion: null, activeTab: 'applications' }));
  };

  if (screen === 'login') return <LoginScreen theme={theme} onToggleTheme={toggleTheme} onLogin={handleLogin} onGoToRegister={() => updateAppState((current) => ({ ...current, screen: 'register' }))} />;
  if (screen === 'register') return <RegisterScreen theme={theme} onToggleTheme={toggleTheme} onRegister={handleRegister} onBack={() => updateAppState((current) => ({ ...current, screen: 'login' }))} />;
  if (screen === 'home' && session) {
    return <HomeScreen
      session={session}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
      onOpenDetail={openDetail}
      activeTab={activeTab}
      onChangeTab={(tab) => updateAppState((current) => ({ ...current, activeTab: tab }))}
    />;
  }
  if (screen === 'detail' && selectedLicitacion && session) {
    return <DetailScreen
      licitacion={selectedLicitacion}
      session={session}
      theme={theme}
      onToggleTheme={toggleTheme}
      onBack={() => updateAppState((current) => ({ ...current, screen: 'home', selectedLicitacion: null }))}
      onApply={openApply}
    />;
  }
  if (screen === 'apply' && selectedLicitacion && session) {
    return <ApplyScreen
      licitacion={selectedLicitacion}
      session={session}
      theme={theme}
      onToggleTheme={toggleTheme}
      onBack={() => updateAppState((current) => ({ ...current, screen: 'detail' }))}
      onSubmit={submitBid}
    />;
  }

  return <LoginScreen theme={theme} onToggleTheme={toggleTheme} onLogin={handleLogin} onGoToRegister={() => updateAppState((current) => ({ ...current, screen: 'register' }))} />;
}

const styles = {
  screen: {
    minHeight: '100vh',
    background: 'var(--app-bg)',
    color: 'var(--text-primary)',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentCenter: { width: '100%', maxWidth: 560, padding: 24 },
  logoBox: { width: 64, height: 64, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  eyebrow: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-accent)', letterSpacing: 0.8 },
  heroTitle: { fontSize: 36, fontWeight: 800, marginTop: 8, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 },
  formCard: { background: 'var(--surface)', borderRadius: 24, padding: 20, border: '1px solid var(--border)' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 10 },
  input: { width: '100%', background: 'var(--app-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--text-primary)', boxSizing: 'border-box', marginBottom: 8 },
  passwordWrap: { display: 'flex', alignItems: 'center', background: 'var(--app-bg)', border: '1px solid var(--border)', borderRadius: 12, paddingLeft: 12 },
  passwordInput: { flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '12px 0', outline: 'none' },
  showPasswordButton: { background: 'transparent', border: 'none', color: 'var(--text-accent)', fontWeight: 700, cursor: 'pointer', padding: '8px 10px' },
  primaryButton: { width: '100%', marginTop: 20, background: 'var(--accent)', border: 'none', borderRadius: 14, padding: '14px 16px', color: 'var(--on-accent)', fontWeight: 700, cursor: 'pointer' },
  primaryButtonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  footerLinkButton: { width: '100%', background: 'transparent', border: 'none', color: 'var(--text-accent)', fontWeight: 700, marginTop: 12, cursor: 'pointer' },
  headerBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 },
  brandWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  brandLogo: { width: 36, height: 36, borderRadius: 12, background: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 },
  brandTitle: { color: 'var(--text-primary)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' },
  brandSubtitle: { color: 'var(--text-muted)', fontSize: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  webHeaderChip: { background: 'var(--surface-raised)', color: 'var(--text-accent)', borderRadius: 999, padding: '4px 10px', fontSize: 11 },
  logoutButton: { background: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' },
  webWorkspace: { display: 'grid', gridTemplateColumns: '260px 1fr', width: '100%', maxWidth: 1200, minHeight: 'calc(100vh - 80px)' },
  sidebar: { background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', padding: 18 },
  webSidebarCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 14, marginBottom: 14 },
  webSidebarLabel: { color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  webSidebarValue: { color: 'var(--text-primary)', fontSize: 28, fontWeight: 800 },
  webSidebarValueSmall: { color: 'var(--text-accent)', fontSize: 15, fontWeight: 700 },
  webSidebarMeta: { color: 'var(--text-secondary)', fontSize: 11, marginTop: 8 },
  mainPane: { background: 'var(--app-bg)', padding: 20 },
  spaceY: { display: 'grid', gap: 14 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  kpiCard: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 12 },
  kpiTextWrap: { flex: 1 },
  kpiLabel: { color: 'var(--text-muted)', fontSize: 10 },
  kpiValue: { color: 'var(--text-primary)', fontSize: 14, fontWeight: 800, marginTop: 3 },
  kpiValueGreen: { color: 'var(--success-text)', fontSize: 14, fontWeight: 800, marginTop: 3 },
  searchBox: { display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px 12px', gap: 8, marginTop: 14 },
  searchInput: { flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, width: '100%', outline: 'none' },
  cardList: { display: 'grid', gap: 12 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 12, cursor: 'pointer' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  code: { background: 'var(--app-bg)', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 9, borderRadius: 8, padding: '3px 6px', border: '1px solid var(--border-strong)' },
  cardTitle: { color: 'var(--text-primary)', fontSize: 15, fontWeight: 800, marginBottom: 8 },
  cardMetaRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardMetaText: { color: 'var(--text-accent)', fontSize: 11 },
  cardInfoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  cardInfoBox: { background: 'var(--app-bg)', padding: 8, borderRadius: 12, border: '1px solid var(--border)' },
  infoLabel: { color: 'var(--text-muted)', fontSize: 9, marginBottom: 4 },
  infoValue: { color: 'var(--text-primary)', fontSize: 11, fontWeight: 700 },
  infoValueGreen: { color: 'var(--success-text)', fontSize: 11, fontWeight: 800 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  footerLeft: { color: 'var(--text-secondary)', fontSize: 10 },
  footerLink: { color: 'var(--text-accent)', fontSize: 10, fontWeight: 700 },
  emptyState: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, textAlign: 'center' },
  emptyTitle: { color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, marginBottom: 8 },
  emptyText: { color: 'var(--text-muted)', fontSize: 12 },
  listHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: 'var(--text-primary)', fontSize: 13, fontWeight: 800 },
  metaText: { color: 'var(--text-muted)', fontSize: 10 },
  applicationCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 12 },
  appHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  appId: { color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 9, background: 'var(--app-bg)', padding: '3px 6px', borderRadius: 8 },
  appStatus: { color: 'var(--success-text)', fontSize: 9, fontWeight: 700, background: 'var(--success-bg)', padding: '4px 8px', borderRadius: 999 },
  appTitle: { color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, marginTop: 8 },
  appEntity: { color: 'var(--text-accent)', fontSize: 10, marginTop: 6 },
  appHashBox: { background: 'var(--app-bg)', borderRadius: 12, border: '1px solid var(--border)', padding: 10, marginTop: 8 },
  hashLabel: { color: 'var(--text-muted)', fontSize: 9 },
  hashValueSmall: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'monospace', marginTop: 4 },
  detailContent: { width: '100%', maxWidth: 760, padding: 18 },
  detailCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 18 },
  detailTitle: { color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginTop: 8 },
  detailOrg: { color: 'var(--text-accent)', fontSize: 12, marginBottom: 12 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  detailBox: { background: 'var(--app-bg)', borderRadius: 12, border: '1px solid var(--border)', padding: 10 },
  paragraph: { color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 },
  requirementRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  requirementText: { color: 'var(--text-primary)', fontSize: 12 },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 700, marginBottom: 14, cursor: 'pointer' },
  uploadBox: { width: '100%', background: 'var(--app-bg)', border: '1px dashed var(--text-accent)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', cursor: 'pointer' },
};
