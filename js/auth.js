/**
 * Login gate for the /kelola/ admin workspace.
 *
 * This is a client-side-only prototype (see README): there is no server,
 * so this is not real protection against anyone who reads the page
 * source or opens devtools — it exists to keep casual visitors out and
 * to attach a name/role to changes made in the admin workspace, not to
 * secure the site against a determined attacker.
 */

(function (global) {
  const SESSION_KEY = 'rohis:session';

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  const AuthSession = {
    async login(username, password) {
      const user = await ContentRepository.verifyUserPassword(username, password);
      if (!user) return null;
      const session = { id: user.id, name: user.name, username: user.username, role: user.role };
      writeSession(session);
      return session;
    },

    logout() {
      sessionStorage.removeItem(SESSION_KEY);
    },

    getCurrentUser() {
      return readSession();
    },

    isAuthenticated() {
      return readSession() !== null;
    },

    isAdmin() {
      const session = readSession();
      return !!session && session.role === 'admin';
    },

    updateCurrentUser(patch) {
      const session = readSession();
      if (!session) return;
      writeSession({ ...session, ...patch });
    },
  };

  global.AuthSession = AuthSession;
})(window);
