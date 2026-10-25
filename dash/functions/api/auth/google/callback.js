import { handleOAuthCallback } from '../../auth.js';

export async function onRequestGet(context) {
  return handleOAuthCallback(context.request, context.env, 'google');
}
