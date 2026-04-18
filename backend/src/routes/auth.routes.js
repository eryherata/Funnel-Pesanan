
import { Router } from 'express';
import { authenticateUser, revokeSession } from '../repositories/auth.repository.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendOk } from '../utils/api-response.js';
import { getPermissionsContext } from '../utils/permissions.js';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const username = req.body?.username;
  const password = req.body?.password;
  if (!username || !password) {
    const error = new Error('username dan password wajib diisi.');
    error.status = 400;
    throw error;
  }
  const session = await authenticateUser(username, password);
  if (!session) {
    const error = new Error('Username atau password tidak valid.');
    error.status = 401;
    throw error;
  }
  sendCreated(req, res, { ...session, permissions: getPermissionsContext(session?.user?.role) });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  sendOk(req, res, {
    user: req.auth.user,
    session: {
      token: req.auth.token,
      expires_at: req.auth.expires_at,
      last_seen_at: req.auth.last_seen_at,
    },
    permissions: getPermissionsContext(req.auth?.user?.role),
  });
}));

router.get('/permissions', requireAuth, asyncHandler(async (req, res) => {
  sendOk(req, res, getPermissionsContext(req.auth?.user?.role));
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await revokeSession(req.auth.token);
  sendOk(req, res, { logged_out: true });
}));

export default router;
