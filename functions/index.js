/**
 * Firebase HTTPS function: FatSecret proxy.
 *
 * Uses `onRequest` instead of `onCall` to avoid v2 callable auth issues
 * on React Native. The client sends the Firebase ID token manually.
 *
 * Credentials (never in the Expo app):
 * - Production: Secret Manager via `defineSecret`.
 * - Local emulator: `functions/.secret.local`.
 *
 * Deploy:
 *   firebase deploy --only functions:fatsecretProxy
 */
'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { runFatSecretProxy } = require('./fatsecretCore');

if (!admin.apps.length) {
  admin.initializeApp();
}

const fatsecretClientId = defineSecret('FATSECRET_CLIENT_ID');
const fatsecretClientSecret = defineSecret('FATSECRET_CLIENT_SECRET');

exports.fatsecretProxy = onRequest(
  {
    region: 'us-central1',
    secrets: [fatsecretClientId, fatsecretClientSecret],
    cors: true,
    invoker: 'public',
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      res.status(401).json({ error: 'Missing Authorization header.' });
      return;
    }

    let uid;
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      uid = decoded.uid;
    } catch (err) {
      console.error('[fatsecretProxy] Token verification failed:', err.message);
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }

    const clientId = String(fatsecretClientId.value() || '').trim();
    const clientSecret = String(fatsecretClientSecret.value() || '').trim();
    if (!clientId || !clientSecret) {
      res.status(500).json({
        error: 'Food search is not configured. Set FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET.',
      });
      return;
    }

    const data = req.body && typeof req.body === 'object' ? req.body : {};
    console.log('[fatsecretProxy]', { action: data.action, uid });

    try {
      const result = await runFatSecretProxy(data, { clientId, clientSecret });
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[fatsecretProxy]', message);
      res.status(500).json({ error: message || 'FatSecret request failed.' });
    }
  },
);
