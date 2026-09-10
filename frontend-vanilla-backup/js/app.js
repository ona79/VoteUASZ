// App State & Mock Database
const state = {
  currentUser: {
    matricule: 'ADMIN001',
    nom: 'Diallo',
    prenom: 'Mamadou',
    email: 'admin@uasz.sn',
    role: 'SUPER_ADMIN',
    typeElecteur: 'PATS',
    ufr: 'ADMINISTRATION'
  },
  activeTab: 'admin',
  elections: [
    {
      id: 1,
      titre: 'Élection Délégué L3 Informatique 2026',
      description: 'Élection du délégué titulaire et suppléant de la classe de L3 Informatique UASZ.',
      type: 'DELEGUE',
      statut: 'VOTE_OUVERT', // CONFIGURATION, CAMPAGNE, VOTE_OUVERT, DEPOUILLEMENT, PUBLICATION, CLOTURE
      targetUfr: 'UFR_SAT',
      targetFiliere: 'INFORMATIQUE',
      targetNiveau: 'L3',
      dateDebut: '2026-09-01T08:00',
      dateFin: '2026-09-01T18:00'
    }
  ],
  candidatures: [
    {
      id: 101,
      electionId: 1,
      candidatId: 3,
      candidatNom: 'Awa Ndiaye',
      nomListe: 'Liste Émergence Informatique',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      programmePdf: 'https://uasz.sn/programme_awa.pdf',
      cvUrl: 'https://uasz.sn/cv_awa.pdf',
      statut: 'APPROVED',
      motifRejet: null,
      votes: 142
    },
    {
      id: 102,
      electionId: 1,
      candidatId: 4,
      candidatNom: 'Ousmane Diagne',
      nomListe: 'Alliance pour le Progrès Tech',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      programmePdf: 'https://uasz.sn/programme_ousmane.pdf',
      cvUrl: 'https://uasz.sn/cv_ousmane.pdf',
      statut: 'APPROVED',
      motifRejet: null,
      votes: 98
    }
  ],
  campaignPosts: [
    {
      id: 1,
      candidatureId: 101,
      titre: 'Notre vision pour les laboratoires de TP',
      contenu: 'Nous nous engageons à négocier un accès H24 aux salles informatiques et une connexion haut débit pour tous.',
      afficheUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
      videoEmbedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    }
  ],
  importedUsers: [
    { matricule: '20230001', nom: 'Sarr', prenom: 'Amadou', email: 'amadou.sarr@uasz.sn', role: 'ELECTEUR', typeElecteur: 'ETUDIANT', ufr: 'UFR_SAT', filiere: 'INFORMATIQUE', niveau: 'L3' },
    { matricule: '20230002', nom: 'Fall', prenom: 'Khadija', email: 'khadija.fall@uasz.sn', role: 'ELECTEUR', typeElecteur: 'ETUDIANT', ufr: 'UFR_SAT', filiere: 'INFORMATIQUE', niveau: 'L3' }
  ],
  hasVoted: false,
  otpTimer: null,
  otpTimeRemaining: 300,
  activeVoteToken: null,
  selectedCandidateId: null,
  auditLogs: [
    { votedAt: '2026-09-01 09:12:44', ipHash: '8f9a2b...e41' },
    { votedAt: '2026-09-01 09:15:02', ipHash: '3c1d4e...a90' }
  ],
  complaints: [
    { id: 1, electionId: 1, auteur: 'Ousmane Diagne', sujet: 'Affichage électoral tardif', description: 'Le panneau d affichage physique a été libéré avec 2h de retard.', statut: 'RESOLVED', reponse: 'Panneau nettoyé et 2h supplémentaires accordées.' }
  ]
};

// DOM Initialization
function initApp() {
  renderNavbar();
  renderTabContent();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Switch Active Role Simulation
function switchRole(newRole) {
  state.currentUser.role = newRole;
  if (newRole === 'SUPER_ADMIN') state.activeTab = 'admin';
  else if (newRole === 'COMMISSION_ELECTORALE') state.activeTab = 'commission';
  else if (newRole === 'CANDIDAT') state.activeTab = 'candidat';
  else if (newRole === 'ELECTEUR') state.activeTab = 'elector';
  
  renderNavbar();
  renderTabContent();
}

function setActiveTab(tab) {
  state.activeTab = tab;
  renderNavbar();
  renderTabContent();
}

// Render Navigation Header
function renderNavbar() {
  const userPill = document.getElementById('user-pill-container');
  if (userPill) {
    userPill.innerHTML = `
      <div class="user-pill">
        <span>👤 ${state.currentUser.prenom} ${state.currentUser.nom}</span>
        <span class="role-tag">${state.currentUser.role.replace('_', ' ')}</span>
      </div>
    `;
  }
}

// Render Main Tab Content according to Active Tab & Role
function renderTabContent() {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (state.activeTab === 'admin') {
    content.innerHTML = renderAdminDashboard();
  } else if (state.activeTab === 'commission') {
    content.innerHTML = renderCommissionDashboard();
  } else if (state.activeTab === 'candidat') {
    content.innerHTML = renderCandidatSpace();
  } else if (state.activeTab === 'elector') {
    content.innerHTML = renderElectorSpace();
  } else if (state.activeTab === 'live') {
    content.innerHTML = renderLiveDashboard();
  } else if (state.activeTab === 'audit') {
    content.innerHTML = renderAuditSpace();
  }
}

/* ==================== SUPER-ADMIN DASHBOARD ==================== */
function renderAdminDashboard() {
  const election = state.elections[0];
  return `
    <div class="card">
      <div class="card-title">
        <span>⚙️ Tableau de Bord Super-Admin Électoral</span>
        <span class="badge badge-${election.statut.toLowerCase()}">${election.statut}</span>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
        Gestion de la configuration globale, des collèges électoraux et des transitions d'état de l'élection.
      </p>

      <h3 style="margin-bottom: 1rem;">Machine à États du Scrutin</h3>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 2rem;">
        <button class="btn ${election.statut === 'CONFIGURATION' ? 'btn-primary' : 'btn-outline'}" onclick="changeElectionStatus('CONFIGURATION')">1. CONFIGURATION</button>
        <button class="btn ${election.statut === 'CAMPAGNE' ? 'btn-warning' : 'btn-outline'}" onclick="changeElectionStatus('CAMPAGNE')">2. CAMPAGNE</button>
        <button class="btn ${election.statut === 'VOTE_OUVERT' ? 'btn-success' : 'btn-outline'}" onclick="changeElectionStatus('VOTE_OUVERT')">3. VOTE_OUVERT</button>
        <button class="btn ${election.statut === 'DEPOUILLEMENT' ? 'btn-primary' : 'btn-outline'}" onclick="changeElectionStatus('DEPOUILLEMENT')">4. DEPOUILLEMENT</button>
        <button class="btn ${election.statut === 'PUBLICATION' ? 'btn-primary' : 'btn-outline'}" onclick="changeElectionStatus('PUBLICATION')">5. PUBLICATION</button>
        <button class="btn ${election.statut === 'CLOTURE' ? 'btn-danger' : 'btn-outline'}" onclick="changeElectionStatus('CLOTURE')">6. CLOTURE</button>
      </div>

      <div class="grid-2">
        <div>
          <h3>📥 Import Massif des Électeurs (CSV)</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            Format : matricule, nom, prenom, email, telephone, role, type_electeur, ufr, filiere, niveau
          </p>
          <div style="border: 2px dashed var(--dark-border); padding: 2rem; border-radius: var(--radius); text-align: center; background: rgba(15,23,42,0.4); margin-bottom: 1rem;">
            📄 Glissez votre fichier CSV ici ou <br>
            <input type="file" id="csvFileInput" accept=".csv" style="display: none;" onchange="handleCsvUpload(event)">
            <button class="btn btn-outline" style="margin-top: 0.75rem;" onclick="document.getElementById('csvFileInput').click()">Parcourir le fichier</button>
          </div>
          <button class="btn btn-primary" onclick="simulateCsvImport()">⚡ Simuler l'import de 50 électeurs</button>
        </div>

        <div>
          <h3>👥 Liste des Électeurs Pré-provisionnés (${state.importedUsers.length})</h3>
          <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom & Prénom</th>
                  <th>UFR / Filière</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                ${state.importedUsers.map(u => `
                  <tr>
                    <td><code>${u.matricule}</code></td>
                    <td>${u.prenom} ${u.nom}</td>
                    <td>${u.ufr} (${u.filiere})</td>
                    <td><span class="role-tag">${u.typeElecteur}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function changeElectionStatus(newStatus) {
  state.elections[0].statut = newStatus;
  alert(`Statut de l'élection mis à jour : ${newStatus}`);
  renderTabContent();
}

function simulateCsvImport() {
  state.importedUsers.push(
    { matricule: '20230003', nom: 'Diallo', prenom: 'Mariama', email: 'mariama.diallo@uasz.sn', role: 'ELECTEUR', typeElecteur: 'ETUDIANT', ufr: 'UFR_SAT', filiere: 'INFORMATIQUE', niveau: 'L3' },
    { matricule: '20230004', nom: 'Ba', prenom: 'Ibrahima', email: 'ibrahima.ba@uasz.sn', role: 'ELECTEUR', typeElecteur: 'ETUDIANT', ufr: 'UFR_SAT', filiere: 'INFORMATIQUE', niveau: 'L3' }
  );
  alert('Import réussi : 2 nouveaux électeurs ajoutés avec succès !');
  renderTabContent();
}

function handleCsvUpload(event) {
  alert('Fichier CSV chargé et validé avec succès !');
  simulateCsvImport();
}

/* ==================== COMMISSION ÉLECTORALE DASHBOARD ==================== */
function renderCommissionDashboard() {
  return `
    <div class="card">
      <div class="card-title">
        <span>🏛️ Espace Commission Électorale</span>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
        Validation des candidatures, traitement des réclamations post-électorales et supervision du dépouillement.
      </p>

      <h3 style="margin-bottom: 1rem;">Dossiers de Candidature à Valider</h3>
      <div class="table-responsive" style="margin-bottom: 2rem;">
        <table>
          <thead>
            <tr>
              <th>Candidat</th>
              <th>Nom de Liste</th>
              <th>Documents</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${state.candidatures.map(c => `
              <tr>
                <td><strong>${c.candidatNom}</strong></td>
                <td>${c.nomListe}</td>
                <td>
                  <a href="${c.programmePdf}" target="_blank" style="color: var(--primary);">📄 Programme</a> | 
                  <a href="${c.cvUrl}" target="_blank" style="color: var(--primary);">📋 CV</a>
                </td>
                <td><span class="badge ${c.statut === 'APPROVED' ? 'badge-vote' : 'badge-campagne'}">${c.statut}</span></td>
                <td>
                  ${c.statut === 'PENDING' ? `
                    <button class="btn btn-success" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="validateCandidacy(${c.id}, true)">Approuver</button>
                    <button class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="validateCandidacy(${c.id}, false)">Rejeter</button>
                  ` : `<span style="color: var(--text-muted); font-size: 0.85rem;">Traité</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <h3>⚖️ Traitement des Réclamations Électorales (${state.complaints.length})</h3>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Auteur</th>
              <th>Sujet</th>
              <th>Description</th>
              <th>Statut</th>
              <th>Décision</th>
            </tr>
          </thead>
          <tbody>
            ${state.complaints.map(comp => `
              <tr>
                <td>${comp.auteur}</td>
                <td><strong>${comp.sujet}</strong></td>
                <td>${comp.description}</td>
                <td><span class="badge badge-publication">${comp.statut}</span></td>
                <td>${comp.reponse || '<button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="resolveComplaint(' + comp.id + ')">Répondre</button>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function validateCandidacy(id, approved) {
  const cand = state.candidatures.find(c => c.id === id);
  if (cand) {
    cand.statut = approved ? 'APPROVED' : 'REJECTED';
    alert(`Candidature ${approved ? 'approuvée' : 'rejetée'} !`);
    renderTabContent();
  }
}

function resolveComplaint(id) {
  const comp = state.complaints.find(c => c.id === id);
  if (comp) {
    const resp = prompt("Entrez la décision/réponse officielle de la commission :");
    if (resp) {
      comp.reponse = resp;
      comp.statut = 'RESOLVED';
      renderTabContent();
    }
  }
}

/* ==================== ESPACE CANDIDAT ==================== */
function renderCandidatSpace() {
  const posts = state.campaignPosts;
  return `
    <div class="card">
      <div class="card-title">
        <span>📢 Espace Candidat & Campagne Électorale</span>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
        Publication de vos professions de foi, affiches et vidéos de campagne pour l'élection.
      </p>

      <div class="grid-2">
        <div>
          <h3>✏️ Publier un Élément de Campagne</h3>
          <form onsubmit="handlePostSubmit(event)">
            <div class="form-group">
              <label>Titre de la publication</label>
              <input type="text" id="postTitre" class="form-control" placeholder="ex: Notre engagement pour les bourses" required>
            </div>
            <div class="form-group">
              <label>Message / Texte explicatif</label>
              <textarea id="postContenu" class="form-control" rows="3" placeholder="Rédigez votre message aux électeurs..." required></textarea>
            </div>
            <div class="form-group">
              <label>Lien d'intégration Vidéo (YouTube / Vimeo)</label>
              <input type="url" id="postVideoUrl" class="form-control" placeholder="https://www.youtube.com/embed/XXXXXX">
            </div>
            <button type="submit" class="btn btn-primary">🚀 Publier sur la page de campagne</button>
          </form>
        </div>

        <div>
          <h3>🎬 Aperçu des Publications de Campagne (${posts.length})</h3>
          ${posts.map(p => `
            <div style="background: rgba(15,23,42,0.6); border: 1px solid var(--dark-border); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
              <h4>${p.titre}</h4>
              <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0.5rem 0;">${p.contenu}</p>
              ${p.videoEmbedUrl ? `
                <div class="video-container">
                  <iframe src="${p.videoEmbedUrl}" allowfullscreen></iframe>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function handlePostSubmit(e) {
  e.preventDefault();
  const titre = document.getElementById('postTitre').value;
  const contenu = document.getElementById('postContenu').value;
  const videoUrl = document.getElementById('postVideoUrl').value || 'https://www.youtube.com/embed/dQw4w9WgXcQ';

  state.campaignPosts.push({
    id: Date.now(),
    candidatureId: 101,
    titre: titre,
    contenu: contenu,
    afficheUrl: null,
    videoEmbedUrl: videoUrl
  });

  alert('Publication ajoutée à votre campagne !');
  renderTabContent();
}

/* ==================== ESPACE ÉLECTEUR & VOTE OTP ==================== */
function renderElectorSpace() {
  const election = state.elections[0];
  const candidates = state.candidatures.filter(c => c.statut === 'APPROVED');

  return `
    <div class="card">
      <div class="card-title">
        <span>🗳️ Espace Électeur - Bulletin de Vote Sécurisé</span>
        <span class="badge badge-vote">Éligible</span>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
        Scrutin actuel : <strong>${election.titre}</strong> (${election.targetUfr} - ${election.targetFiliere} ${election.targetNiveau})
      </p>

      ${state.hasVoted ? `
        <div style="background: rgba(16,185,129,0.15); border: 1px solid #10b981; padding: 2rem; border-radius: var(--radius); text-align: center;">
          <h2 style="color: #34d399; margin-bottom: 0.5rem;">✅ Votre vote a été enregistré avec succès !</h2>
          <p style="color: var(--text-muted);">Votre suffrage a été chiffré (AES-256) et enregistré de manière strictement anonyme.</p>
          <p style="font-size: 0.85rem; margin-top: 1rem; color: #94a3b8;">Attestation d'émargement cryptographique : <code>hash_8f9a2b3c4d5e6f</code></p>
        </div>
      ` : `
        <div class="grid-2">
          ${candidates.map(c => `
            <div class="candidate-card">
              <img src="${c.photoUrl}" class="candidate-img" alt="${c.candidatNom}">
              <div class="candidate-body">
                <h3>${c.candidatNom}</h3>
                <p style="color: var(--primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem;">${c.nomListe}</p>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                  <a href="${c.programmePdf}" target="_blank" style="color: var(--primary);">📄 Profession de foi (PDF)</a>
                </p>
                ${state.campaignPosts[0] && state.campaignPosts[0].videoEmbedUrl ? `
                  <div class="video-container" style="margin-bottom: 1rem;">
                    <iframe src="${state.campaignPosts[0].videoEmbedUrl}" allowfullscreen></iframe>
                  </div>
                ` : ''}
                <button class="btn btn-primary" style="width: 100%;" onclick="openOtpModal(${c.id}, '${c.candidatNom}')">
                  🔒 Voter pour ce candidat
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- OTP Modal -->
    <div id="otpModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 1000; display: none; align-items: center; justify-content: center;">
      <div class="card" style="max-width: 450px; width: 90%; background: #1e293b; border-color: #3b82f6;">
        <h3 style="margin-bottom: 0.5rem;">🔐 Authentification OTP de Vote</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          Vote pour : <strong id="modalCandidateName" style="color: white;"></strong>
        </p>

        <div id="otpStep1">
          <p style="font-size: 0.9rem; margin-bottom: 1rem;">
            Un code de confirmation OTP à 6 chiffres va être transmis par Email/SMS.
          </p>
          <button class="btn btn-primary" style="width: 100%;" onclick="startOtpProcess()">📩 Demander mon code OTP</button>
        </div>

        <div id="otpStep2" style="display: none;">
          <div class="timer-box">
            ⏱️ Temps restant : <span id="timerDisplay">05:00</span>
          </div>
          <div class="form-group">
            <label>Saisissez le code OTP reçu</label>
            <input type="text" id="otpCodeInput" class="form-control" placeholder="ex: 849201" maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 4px;">
          </div>
          <button class="btn btn-success" style="width: 100%;" onclick="verifyOtpAndCastVote()">Confirm & Valider mon vote</button>
        </div>

        <button class="btn btn-outline" style="width: 100%; margin-top: 0.75rem;" onclick="closeOtpModal()">Annuler</button>
      </div>
    </div>
  `;
}

function openOtpModal(candidateId, candidateName) {
  state.selectedCandidateId = candidateId;
  document.getElementById('otpModal').style.display = 'flex';
  document.getElementById('modalCandidateName').innerText = candidateName;
  document.getElementById('otpStep1').style.display = 'block';
  document.getElementById('otpStep2').style.display = 'none';
}

function closeOtpModal() {
  document.getElementById('otpModal').style.display = 'none';
  if (state.otpTimer) clearInterval(state.otpTimer);
}

function startOtpProcess() {
  document.getElementById('otpStep1').style.display = 'none';
  document.getElementById('otpStep2').style.display = 'block';
  
  alert("Code OTP généré avec succès ! (Code démo : 849201)");
  document.getElementById('otpCodeInput').value = "849201";

  state.otpTimeRemaining = 300;
  state.otpTimer = setInterval(() => {
    state.otpTimeRemaining--;
    const mins = String(Math.floor(state.otpTimeRemaining / 60)).padStart(2, '0');
    const secs = String(state.otpTimeRemaining % 60).padStart(2, '0');
    document.getElementById('timerDisplay').innerText = `${mins}:${secs}`;

    if (state.otpTimeRemaining <= 0) {
      clearInterval(state.otpTimer);
      alert('Code OTP expiré (durée 5 minutes dépassée) !');
      closeOtpModal();
    }
  }, 1000);
}

function verifyOtpAndCastVote() {
  const code = document.getElementById('otpCodeInput').value;
  if (!code || code.length < 6) {
    alert('Veuillez saisir le code OTP à 6 chiffres.');
    return;
  }

  // Increment vote count for chosen candidate
  const cand = state.candidatures.find(c => c.id === state.selectedCandidateId);
  if (cand) {
    cand.votes++;
  }
  
  state.hasVoted = true;
  clearInterval(state.otpTimer);
  closeOtpModal();

  alert("Félicitations ! Votre bulletin chiffré a été déposé de manière 100% anonyme.");
  renderTabContent();
}

/* ==================== LIVE WEBSOCKET DASHBOARD ==================== */
function renderLiveDashboard() {
  const candidates = state.candidatures.filter(c => c.statut === 'APPROVED');
  const totalVotes = candidates.reduce((acc, c) => acc + c.votes, 0);

  return `
    <div class="card">
      <div class="card-title">
        <span>📊 Dépouillement & Résultats en Temps Réel (WebSocket)</span>
        <span class="badge badge-vote">Live Direct</span>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
        Actualisation instantanée des suffrages sans rechargement de page.
      </p>

      <div style="background: rgba(15,23,42,0.6); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 2rem; text-align: center;">
        <h1 style="font-size: 3rem; color: #3b82f6; font-weight: 800;">${totalVotes}</h1>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Total des suffrages exprimés</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${candidates.map(c => {
          const pct = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0;
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 0.4rem;">
                <span>${c.candidatNom} (${c.nomListe})</span>
                <span style="color: var(--primary);">${c.votes} voix (${pct}%)</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="margin-top: 2rem; display: flex; justify-content: flex-end;">
        <button class="btn btn-primary" onclick="simulatePdfExport()">📥 Télécharger le Procès-Verbal PDF Officiel</button>
      </div>
    </div>
  `;
}

function simulatePdfExport() {
  alert('Génération et téléchargement du Procès-Verbal PDF officiel certifié par l\'UASZ !');
}

/* ==================== ESPACE AUDIT ==================== */
function renderAuditSpace() {
  return `
    <div class="card">
      <div class="card-title">
        <span>📜 Journal d'Audit Cryptographique</span>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
        Journalisation complète avec horodatage et hash de vote sans identité de l'électeur (dissociation stricte).
      </p>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Horodatage</th>
              <th>Empreinte IP (Hash)</th>
              <th>Statut d'Intégrité</th>
            </tr>
          </thead>
          <tbody>
            ${state.auditLogs.map(l => `
              <tr>
                <td><code>${l.votedAt}</code></td>
                <td><code>${l.ipHash}</code></td>
                <td><span class="badge badge-vote">Intègre / Valide</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
