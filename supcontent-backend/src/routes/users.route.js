// Routes utilisateur — collection (existant) + profil (nouveau)
const express       = require('express');
const auth          = require('../middleware/auth');
const optionalAuth  = require('../middleware/optionalAuth');

// Contrôleur collection existant (inchangé)
const { getLibrary } = require('../controllers/collections.controller');

// Contrôleur profil
const {
    getProfile,
    getProfileStats,
    updateProfile,
    uploadAvatar,
    deleteAccount,
} = require('../controllers/users.controller');

const { getUserPublicLists } = require('../controllers/lists.controller');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT : les routes avec segments fixes (/me/...) doivent être déclarées
// AVANT les routes avec paramètres dynamiques (/:id/...) pour éviter que
// Express ne traite "me" comme un :id.
// ─────────────────────────────────────────────────────────────────────────────

// ── Routes authentifiées (/me) ────────────────────────────────────────────
router.put('/me/profile', auth, updateProfile);       // Modifier username/bio
router.post('/me/avatar',  auth, uploadAvatar);        // Upload photo de profil
router.delete('/me',       auth, deleteAccount);       // Supprimer le compte

// ── Routes publiques (/:id) ───────────────────────────────────────────────
router.get('/:id/profile',    optionalAuth, getProfile); // Public profile
router.get('/:id/stats',      getProfileStats);        // Stats de collection
router.get('/:id/collection', getLibrary);             // Collection (existant)
router.get('/:id/lists',     getUserPublicLists);       // Public lists

module.exports = router;

