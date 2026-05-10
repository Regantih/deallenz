/**
 * lib/connectors/dropbox.ts
 *
 * Dropbox connector stub.
 *
 * WIRED IN: future PR (credentials not yet set in Vercel).
 *
 * Required env vars (not yet set):
 *   DROPBOX_APP_KEY
 *   DROPBOX_APP_SECRET
 *
 * Throws a clear error on every method call until credentials exist.
 * Never returns mock data in production.
 */

function assertDropboxConfigured(): void {
  if (!process.env.DROPBOX_APP_KEY || !process.env.DROPBOX_APP_SECRET) {
    throw new Error(
      '[deallenz] Dropbox connector is not configured. ' +
        'Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET in ' +
        'Vercel → Settings → Environment Variables (see ENV.md). ' +
        'Dropbox integration is planned for a future PR.'
    );
  }
}

export interface DropboxFile {
  id: string;
  name: string;
  path_lower: string;
  size: number;
  client_modified: string;
}

/**
 * DropboxConnector stub — throws on every method until app credentials are set.
 */
export class DropboxConnector {
  constructor() {
    assertDropboxConfigured();
  }

  /** List files in a Dropbox shared folder URL. */
  async listSharedFolder(_sharedLink: string): Promise<DropboxFile[]> {
    assertDropboxConfigured();
    throw new Error('unreachable');
  }

  /** Download a single Dropbox file as a Buffer. */
  async downloadFile(_path: string): Promise<Buffer> {
    assertDropboxConfigured();
    throw new Error('unreachable');
  }
}
