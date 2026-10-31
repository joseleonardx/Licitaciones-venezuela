import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, Building2, CheckCircle2, Search, ShieldCheck, UploadCloud } from 'lucide-react';
import { apiRequest, mapLicitation } from './src/services/api.js';

const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validatePassword = (value) => value.trim().length >= 6;
const validateRif = (value) => /^[JEVGCP]-\d{8}-\d$/i.test(value.trim());

function LoginScreen({ onLogin, onGoToRegister }) {
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
    <div style={styles.screen}>
      <div style={styles.contentCenter}>
        <div style={styles.logoBox}><ShieldCheck size={28} color="#60a5fa" /></div>
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

function RegisterScreen({ onRegister, onBack }) {
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
    <div style={styles.screen}>
      <div style={styles.contentCenter}>
        <div style={styles.logoBox}><ShieldCheck size={28} color="#60a5fa" /></div>
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

function HomeScreen({ session, onLogout, onOpenDetail }) {
  const [searchText, setSearchText] = useState('');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todas');
  const [activeTab, setActiveTab] = useState('home');
  const [licitaciones, setLicitaciones] = useState([]);
  const [submittedProposals, setSubmittedProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const licitacionesData = await apiRequest('/licitations');
      setLicitaciones(licitacionesData.map(mapLicitation));
    } catch (err) {
      setError(err.message || 'No se pudo cargar licitaciones');
    }

    try {
      const bids = await apiRequest('/bids/my-bids', { token: session.token });
      setSubmittedProposals(Array.isArray(bids) ? bids : []);
    } catch (err) {
      setError((prev) => prev ? `${prev} | ${err.message}` : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [session.token]);

  const filtered = useMemo(() => {
    return licitaciones.filter((item) => {
      const query = searchText.toLowerCase();
      const matchesSearch = !query || item.title.toLowerCase().includes(query) || item.organization.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
      const matchesSector = selectedSector === 'Todos' || item.sector === selectedSector;
      const matchesStatus = selectedStatus === 'Todas' || (selectedStatus === 'Abiertas' && item.status === 'Abierta');
      return matchesSearch && matchesSector && matchesStatus;
    });
  }, [licitaciones, searchText, selectedSector, selectedStatus]);

  const renderCatalog = () => (
    <div style={styles.spaceY}>
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}><BriefcaseBusiness size={16} color="#60a5fa" /><div style={styles.kpiTextWrap}><div style={styles.kpiLabel}>Licitaciones activas</div><div style={styles.kpiValue}>{licitaciones.length}</div></div></div>
        <div style={styles.kpiCard}><ShieldCheck size={16} color="#4ade80" /><div style={styles.kpiTextWrap}><div style={styles.kpiLabel}>Postulaciones</div><div style={styles.kpiValueGreen}>{submittedProposals.length}</div></div></div>
      </div>

      <div style={styles.searchBox}><Search size={16} color="#94a3b8" /><input style={styles.searchInput} value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar obra, entidad o código" /></div>

      <div style={styles.filterGroup}>
        <div style={styles.filterHeaderRow}><span style={styles.filterHeader}>Sector económico</span><span style={styles.filterCounter}>{filtered.length} encontrados</span></div>
        <div style={styles.horizontalRow}>
          {['Todos', 'General'].map((sector) => (
            <button key={sector} type="button" style={{ ...styles.chip, ...(selectedSector === sector ? styles.chipActive : {}) }} onClick={() => setSelectedSector(sector)}>{sector}</button>
          ))}
        </div>
        <div style={styles.statusRow}>
          {['Todas', 'Abiertas'].map((status) => (
            <button key={status} type="button" style={{ ...styles.statusChip, ...(selectedStatus === status ? styles.statusChipActive : {}) }} onClick={() => setSelectedStatus(status)}>{status}</button>
          ))}
        </div>
      </div>

      <div style={styles.cardList}>
        {error && <div style={styles.emptyState}><div style={styles.emptyTitle}>No se pudo cargar el catálogo</div><div style={styles.emptyText}>{error}</div><button type="button" style={styles.primaryButton} onClick={loadDashboard}>Reintentar</button></div>}
        {loading && !error ? <div style={styles.emptyState}><div style={styles.emptyText}>Cargando licitaciones...</div></div> : null}
        {!loading && filtered.length === 0 && !error ? <div style={styles.emptyState}><div style={styles.emptyTitle}>No hay resultados</div><div style={styles.emptyText}>Prueba con otra palabra clave o cambia los filtros.</div></div> : null}

        {filtered.map((item) => (
          <div key={item.id} style={styles.card} onClick={() => onOpenDetail(item)}>
            <div style={styles.cardTop}><span style={styles.code}>{item.id}</span><span style={{ ...styles.statusPill, ...(item.status === 'Abierta' ? styles.statusOpen : styles.statusReview) }}>{item.status}</span></div>
            <div style={styles.cardTitle}>{item.title}</div>
            <div style={styles.cardMetaRow}><Building2 size={13} color="#60a5fa" /><span style={styles.cardMetaText}>{item.organization}</span></div>
            <div style={styles.cardInfoGrid}>
              <div style={styles.cardInfoBox}><div style={styles.infoLabel}>Ubicación</div><div style={styles.infoValue}>{item.location}</div></div>
              <div style={styles.cardInfoBox}><div style={styles.infoLabel}>Monto</div><div style={styles.infoValueGreen}>{item.budget}</div></div>
            </div>
            <div style={styles.cardFooter}><span style={styles.footerLeft}>{item.daysLeft === null ? item.deadline : `Cierra en ${item.daysLeft} días`}</span><span style={styles.footerLink}>Ver pliego</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApplications = () => (
    <div style={styles.spaceY}>
      <div style={styles.listHeaderRow}><div style={styles.sectionTitle}>Historial de postulaciones</div><div style={styles.metaText}>{submittedProposals.length} enviadas</div></div>
      {submittedProposals.length === 0 ? <div style={styles.emptyState}><div style={styles.emptyText}>Todavía no has enviado postulaciones.</div></div> : submittedProposals.map((app) => (
        <div key={app.id || `${app.licitationId}-${app.submittedAt}`} style={styles.applicationCard}>
          <div style={styles.appHeaderRow}><span style={styles.appId}>{app.id}</span><span style={styles.appStatus}>{app.status || 'Enviada'}</span></div>
          <div style={styles.appTitle}>{app.licitationTitle || app.licitationId}</div>
          <div style={styles.appEntity}>Enviada: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('es-VE') : 'Fecha no disponible'}</div>
          <div style={styles.appHashBox}><div style={styles.hashLabel}>Archivo de propuesta</div><div style={styles.hashValueSmall}>{app.pdfUrl || 'Sin referencia disponible'}</div></div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={styles.screen}>
      <div style={styles.headerBar}>
        <div style={styles.brandWrap}>
          <div style={styles.brandLogo}>LV</div>
          <div>
            <div style={styles.brandTitle}>Licitaciones VZLA</div>
            <div style={styles.brandSubtitle}>Panel de compras</div>
          </div>
        </div>
        <div style={styles.headerRight}><div style={styles.webHeaderChip}>Online</div><button type="button" onClick={onLogout} style={styles.logoutButton}>Salir</button></div>
      </div>

      <div style={styles.webWorkspace}>
        <aside style={styles.sidebar}>
          <div style={styles.webSidebarCard}><div style={styles.webSidebarLabel}>Resumen</div><div style={styles.webSidebarValue}>{licitaciones.length}</div><div style={styles.webSidebarMeta}>licitaciones disponibles</div></div>
          <div style={styles.webSidebarCard}><div style={styles.webSidebarLabel}>Rif</div><div style={styles.webSidebarValueSmall}>{session.rif || 'Autenticada'}</div><div style={styles.webSidebarMeta}>{session.name || session.razonSocial || 'Empresa'}</div></div>
          <div style={styles.webSidebarCard}>
            <div style={styles.webSidebarLabel}>Acciones rápidas</div>
            <button type="button" style={{ ...styles.webMenuItem, ...(activeTab === 'home' ? styles.webMenuItemActive : {}) }} onClick={() => setActiveTab('home')}>Catálogo</button>
            <button type="button" style={{ ...styles.webMenuItem, ...(activeTab === 'applications' ? styles.webMenuItemActive : {}) }} onClick={() => setActiveTab('applications')}>Postulaciones</button>
          </div>
        </aside>

        <main style={styles.mainPane}>
          <div style={styles.searchBox}><Search size={16} color="#94a3b8" /><input style={styles.searchInput} value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar licitación, entidad o código..." /></div>
          {activeTab === 'home' && renderCatalog()}
          {activeTab === 'applications' && renderApplications()}
        </main>
      </div>
    </div>
  );
}

function DetailScreen({ licitacion, onBack, onApply, session }) {
  return (
    <div style={styles.screen}>
      <div style={styles.detailContent}>
        <button type="button" onClick={onBack} style={styles.backButton}><ArrowLeft size={18} color="#dfe7f2" /> Volver</button>
        <div style={styles.detailCard}>
          <div style={styles.cardTop}><span style={styles.code}>{licitacion.id}</span><span style={{ ...styles.statusPill, ...(licitacion.status === 'Abierta' ? styles.statusOpen : styles.statusReview) }}>{licitacion.status}</span></div>
          <div style={styles.detailTitle}>{licitacion.title}</div>
          <div style={styles.detailOrg}>{licitacion.organization}</div>
          <div style={styles.detailGrid}>
            <div style={styles.detailBox}><div style={styles.infoLabel}>Presupuesto</div><div style={styles.infoValueGreen}>{licitacion.budget}</div></div>
            <div style={styles.detailBox}><div style={styles.infoLabel}>Vence</div><div style={styles.infoValue}>{licitacion.deadline}</div></div>
          </div>

          <div style={styles.sectionTitle}>Descripción</div>
          <div style={styles.paragraph}>{licitacion.description}</div>

          <div style={styles.sectionTitle}>Requisitos</div>
          {licitacion.requirements.length === 0 ? <div style={styles.emptyText}>No se especificaron requisitos adicionales.</div> : licitacion.requirements.map((requirement) => (
            <div key={requirement} style={styles.requirementRow}><CheckCircle2 size={16} color="#4ade80" /><span style={styles.requirementText}>{requirement}</span></div>
          ))}

          <button type="button" style={styles.primaryButton} onClick={() => onApply(licitacion, session)}>Postularme</button>
        </div>
      </div>
    </div>
  );
}

function ApplyScreen({ licitacion, session, onBack, onSubmit }) {
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
    <div style={styles.screen}>
      <div style={styles.detailContent}>
        <button type="button" onClick={onBack} style={styles.backButton}><ArrowLeft size={18} color="#dfe7f2" /> Cancelar</button>
        <div style={styles.detailCard}>
          <div style={styles.detailTitle}>Formulario de postulación</div>
          <div style={styles.detailOrg}>{licitacion.title}</div>

          <div style={styles.label}>Cargar propuesta técnica y financiera (PDF)</div>
          <button type="button" onClick={pickPdf} style={styles.uploadBox}><UploadCloud size={20} color="#60a5fa" /><span>{selectedFile ? selectedFile.name : 'Adjuntar PDF'}</span></button>

          <button type="button" style={{ ...styles.primaryButton, ...(uploading ? styles.primaryButtonDisabled : {}) }} onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Enviando...' : 'Transmitir postulación oficial'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [session, setSession] = useState(null);
  const [selectedLicitacion, setSelectedLicitacion] = useState(null);

  const handleLogin = (company) => {
    setSession(company);
    setScreen('home');
  };

  const handleRegister = (company) => {
    setSession(company);
    setScreen('home');
  };

  const handleLogout = () => {
    setSession(null);
    setSelectedLicitacion(null);
    setScreen('login');
  };

  const openDetail = (licitation) => {
    setSelectedLicitacion(licitation);
    setScreen('detail');
  };

  const openApply = (licitation) => {
    setSelectedLicitacion(licitation);
    setScreen('apply');
  };

  const submitBid = () => {
    setScreen('home');
  };

  if (screen === 'login') return <LoginScreen onLogin={handleLogin} onGoToRegister={() => setScreen('register')} />;
  if (screen === 'register') return <RegisterScreen onRegister={handleRegister} onBack={() => setScreen('login')} />;
  if (screen === 'home' && session) return <HomeScreen session={session} onLogout={handleLogout} onOpenDetail={openDetail} />;
  if (screen === 'detail' && selectedLicitacion) return <DetailScreen licitacion={selectedLicitacion} session={session} onBack={() => setScreen('home')} onApply={openApply} />;
  if (screen === 'apply' && selectedLicitacion) return <ApplyScreen licitacion={selectedLicitacion} session={session} onBack={() => setScreen('detail')} onSubmit={submitBid} />;

  return <LoginScreen onLogin={handleLogin} onGoToRegister={() => setScreen('register')} />;
}

const styles = {
  screen: {
    minHeight: '100vh',
    background: '#020817',
    color: '#f8fafc',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentCenter: { width: '100%', maxWidth: 560, padding: 24 },
  logoBox: { width: 64, height: 64, borderRadius: 18, background: '#0f172a', border: '1px solid #1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  eyebrow: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#60a5fa', letterSpacing: 0.8 },
  heroTitle: { fontSize: 36, fontWeight: 800, marginTop: 8, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  formCard: { background: '#0f172a', borderRadius: 24, padding: 20, border: '1px solid #1e293b' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8, marginTop: 10 },
  input: { width: '100%', background: '#020817', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#f8fafc', boxSizing: 'border-box', marginBottom: 8 },
  passwordWrap: { display: 'flex', alignItems: 'center', background: '#020817', border: '1px solid #1e293b', borderRadius: 12, paddingLeft: 12 },
  passwordInput: { flex: 1, background: 'transparent', border: 'none', color: '#f8fafc', padding: '12px 0', outline: 'none' },
  showPasswordButton: { background: 'transparent', border: 'none', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', padding: '8px 10px' },
  primaryButton: { width: '100%', marginTop: 20, background: '#2563eb', border: 'none', borderRadius: 14, padding: '14px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  primaryButtonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  footerLinkButton: { width: '100%', background: 'transparent', border: 'none', color: '#60a5fa', fontWeight: 700, marginTop: 12, cursor: 'pointer' },
  headerBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#0f172a', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 10 },
  brandWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  brandLogo: { width: 36, height: 36, borderRadius: 12, background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 },
  brandTitle: { color: '#f8fafc', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' },
  brandSubtitle: { color: '#94a3b8', fontSize: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  webHeaderChip: { background: '#15213d', color: '#93c5fd', borderRadius: 999, padding: '4px 10px', fontSize: 11 },
  logoutButton: { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' },
  webWorkspace: { display: 'grid', gridTemplateColumns: '260px 1fr', width: '100%', maxWidth: 1200, minHeight: 'calc(100vh - 80px)' },
  sidebar: { background: '#0b1220', borderRight: '1px solid #1e293b', padding: 18 },
  webSidebarCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 18, padding: 14, marginBottom: 14 },
  webSidebarLabel: { color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  webSidebarValue: { color: '#f8fafc', fontSize: 28, fontWeight: 800 },
  webSidebarValueSmall: { color: '#93c5fd', fontSize: 15, fontWeight: 700 },
  webSidebarMeta: { color: '#cbd5e1', fontSize: 11, marginTop: 8 },
  webMenuItem: { width: '100%', background: '#020817', border: '1px solid #1e293b', color: '#cbd5e1', borderRadius: 10, padding: '10px 12px', marginTop: 8, textAlign: 'left', cursor: 'pointer' },
  webMenuItemActive: { background: '#1d4ed8', color: '#fff', borderColor: '#3b82f6' },
  mainPane: { background: '#020817', padding: 20 },
  spaceY: { display: 'grid', gap: 14 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  kpiCard: { display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 18, padding: 12 },
  kpiTextWrap: { flex: 1 },
  kpiLabel: { color: '#94a3b8', fontSize: 10 },
  kpiValue: { color: '#f8fafc', fontSize: 14, fontWeight: 800, marginTop: 3 },
  kpiValueGreen: { color: '#4ade80', fontSize: 14, fontWeight: 800, marginTop: 3 },
  searchBox: { display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: '8px 12px', gap: 8, marginTop: 14 },
  searchInput: { flex: 1, background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 14, width: '100%', outline: 'none' },
  filterGroup: { background: '#0f172a', borderRadius: 18, border: '1px solid #1e293b', padding: 12 },
  filterHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  filterHeader: { color: '#cbd5e1', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 },
  filterCounter: { color: '#94a3b8', fontSize: 9 },
  horizontalRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: { background: '#020817', border: '1px solid #334155', borderRadius: 10, padding: '7px 10px', color: '#cbd5e1', cursor: 'pointer' },
  chipActive: { background: '#2563eb', borderColor: '#3b82f6', color: '#fff' },
  statusRow: { display: 'flex', gap: 8, marginTop: 10 },
  statusChip: { background: '#020817', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', padding: '5px 8px', cursor: 'pointer' },
  statusChipActive: { borderColor: '#60a5fa', background: '#0f172a', color: '#93c5fd' },
  cardList: { display: 'grid', gap: 12 },
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: 12, cursor: 'pointer' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  code: { background: '#020817', color: '#cbd5e1', fontFamily: 'monospace', fontSize: 9, borderRadius: 8, padding: '3px 6px', border: '1px solid #334155' },
  statusPill: { borderRadius: 999, padding: '4px 8px', fontSize: 9, fontWeight: 700 },
  statusOpen: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
  statusReview: { background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' },
  cardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 800, marginBottom: 8 },
  cardMetaRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardMetaText: { color: '#93c5fd', fontSize: 11 },
  cardInfoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  cardInfoBox: { background: '#020817', padding: 8, borderRadius: 12, border: '1px solid #1e293b' },
  infoLabel: { color: '#94a3b8', fontSize: 9, marginBottom: 4 },
  infoValue: { color: '#f8fafc', fontSize: 11, fontWeight: 700 },
  infoValueGreen: { color: '#4ade80', fontSize: 11, fontWeight: 800 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  footerLeft: { color: '#cbd5e1', fontSize: 10 },
  footerLink: { color: '#60a5fa', fontSize: 10, fontWeight: 700 },
  emptyState: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 18, padding: 20, textAlign: 'center' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 800, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 12 },
  listHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#f8fafc', fontSize: 13, fontWeight: 800 },
  metaText: { color: '#94a3b8', fontSize: 10 },
  applicationCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 18, padding: 12 },
  appHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  appId: { color: '#cbd5e1', fontFamily: 'monospace', fontSize: 9, background: '#020817', padding: '3px 6px', borderRadius: 8 },
  appStatus: { color: '#4ade80', fontSize: 9, fontWeight: 700, background: 'rgba(34,197,94,0.08)', padding: '4px 8px', borderRadius: 999 },
  appTitle: { color: '#f8fafc', fontSize: 13, fontWeight: 800, marginTop: 8 },
  appEntity: { color: '#93c5fd', fontSize: 10, marginTop: 6 },
  appHashBox: { background: '#020817', borderRadius: 12, border: '1px solid #1e293b', padding: 10, marginTop: 8 },
  hashLabel: { color: '#94a3b8', fontSize: 9 },
  hashValueSmall: { color: '#cbd5e1', fontSize: 9, fontFamily: 'monospace', marginTop: 4 },
  detailContent: { width: '100%', maxWidth: 760, padding: 18 },
  detailCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 22, padding: 18 },
  detailTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 800, marginTop: 8 },
  detailOrg: { color: '#93c5fd', fontSize: 12, marginBottom: 12 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  detailBox: { background: '#020817', borderRadius: 12, border: '1px solid #1e293b', padding: 10 },
  paragraph: { color: '#cbd5e1', lineHeight: 1.6, marginTop: 8 },
  requirementRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  requirementText: { color: '#e2e8f0', fontSize: 12 },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#dfe7f2', fontWeight: 700, marginBottom: 14, cursor: 'pointer' },
  uploadBox: { width: '100%', background: '#020817', border: '1px dashed #60a5fa', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', cursor: 'pointer' },
};
