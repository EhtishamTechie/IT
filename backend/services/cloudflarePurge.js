/**
 * Cloudflare Cache Purge Utility
 *
 * Automatically purges Cloudflare edge cache whenever homepage data changes.
 * Requires two environment variables set on the server:
 *   CLOUDFLARE_ZONE_ID   — found in Cloudflare Dashboard → your domain → Overview (right sidebar)
 *   CLOUDFLARE_API_TOKEN — create at https://dash.cloudflare.com/profile/api-tokens
 *                          with permission: Zone → Cache Purge → Purge
 *
 * If either variable is missing, purge is silently skipped (safe to deploy without them).
 */

const https = require('https');

/**
 * Purge specific URLs from Cloudflare's edge cache.
 * @param {string[]} urls - Absolute URLs to purge (e.g. ['https://internationaltijarat.com/api/homepage/all-data'])
 */
async function purgeCloudflareUrls(urls) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !apiToken) {
    // Credentials not configured — skip silently
    return;
  }

  try {
    const body = JSON.stringify({ files: urls });

    await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.cloudflare.com',
          path: `/client/v4/zones/${zoneId}/purge_cache`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.success) {
                console.log('✅ Cloudflare cache purged for:', urls);
              } else {
                console.warn('⚠️  Cloudflare purge returned errors:', json.errors);
              }
            } catch {
              console.warn('⚠️  Could not parse Cloudflare purge response');
            }
            resolve();
          });
        }
      );

      req.on('error', (err) => {
        console.warn('⚠️  Cloudflare purge request failed (non-fatal):', err.message);
        resolve(); // Don't fail the main request
      });

      req.setTimeout(5000, () => {
        console.warn('⚠️  Cloudflare purge request timed out (non-fatal)');
        req.destroy();
        resolve();
      });

      req.write(body);
      req.end();
    });
  } catch (err) {
    console.warn('⚠️  Cloudflare purge error (non-fatal):', err.message);
    // Never throw — purge failure must not break the save response
  }
}

/**
 * Purge everything in the Cloudflare zone cache.
 * Use sparingly — this clears ALL cached content for the domain.
 */
async function purgeCloudflareAll() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !apiToken) return;

  try {
    const body = JSON.stringify({ purge_everything: true });

    await new Promise((resolve) => {
      const req = https.request(
        {
          hostname: 'api.cloudflare.com',
          path: `/client/v4/zones/${zoneId}/purge_cache`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.success) console.log('✅ Cloudflare full cache purge complete');
              else console.warn('⚠️  Cloudflare full purge errors:', json.errors);
            } catch {}
            resolve();
          });
        }
      );
      req.on('error', () => resolve());
      req.setTimeout(5000, () => { req.destroy(); resolve(); });
      req.write(body);
      req.end();
    });
  } catch {}
}

module.exports = { purgeCloudflareUrls, purgeCloudflareAll };
