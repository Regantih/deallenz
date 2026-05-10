/**
 * lib/connectors/google-drive.ts
 *
 * Google Drive connector stub.
 *
 * WIRED IN: future PR (credentials not yet set in Vercel).
 *
 * Required env vars (not yet set):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *
 * Throws a clear error on every method call until credentials exist.
 * Never returns mock data in production.
 */

function assertGoogleConfigured(): void {
  if (
    !process.env.GOOGLE_OAUTH_CLIENT_ID ||
    !process.env.GOOGLE_OAUTH_CLIENT_SECRET
  ) {
    throw new Error(
      '[deallenz] Google Drive connector is not configured. ' +
        'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in ' +
        'Vercel → Settings → Environment Variables (see ENV.md). ' +
        'Google Drive integration is planned for a future PR.'
    );
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink: string;
}

/**
 * GoogleDriveConnector stub — throws on every method until OAuth credentials are set.
 */
export class GoogleDriveConnector {
  constructor() {
    assertGoogleConfigured();
  }

  /** List files in a Google Drive folder. */
  async listFolder(_folderId: string): Promise<DriveFile[]> {
    assertGoogleConfigured();
    throw new Error('unreachable');
  }

  /** Download a single Drive file as a Buffer. */
  async downloadFile(_fileId: string): Promise<Buffer> {
    assertGoogleConfigured();
    throw new Error('unreachable');
  }
}
