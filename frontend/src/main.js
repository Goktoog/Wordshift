import { initSettings } from './features/settings.js';
import { initAuth } from './features/auth.js';
import { initModal } from './ui/modal.js';
import { initNavigation } from './core/router.js';

initSettings();
initModal();
initNavigation();
initAuth();
