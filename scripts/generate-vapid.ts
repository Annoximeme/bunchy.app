import webpush from "web-push";

/**
 * Generate the VAPID key pair that push notifications are signed with.
 *
 * Run once, put the output in `.env`, and keep it. These are not rotated
 * casually: the public key is baked into every subscription a browser has
 * created, so replacing the pair silently invalidates all of them and every
 * member has to grant permission again on every device.
 *
 *   npm run vapid
 */
const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`VAPID_PUBLIC_KEY="${publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${privateKey}"`);
console.log('VAPID_SUBJECT="mailto:hello@bunchy.app"');
