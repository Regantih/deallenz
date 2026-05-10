/**
 * StorageClient — abstract file-storage interface.
 *
 * Real implementation: lib/storage.supabase.ts  (WIRED — SUPABASE_SECRET_KEY required)
 * Mock:               lib/storage.mock.ts        (dev/staging only; throws in prod)
 *
 * Both implementations must satisfy this interface exactly.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface UploadedFile {
  /** Storage key, e.g. "deals/{deal_id}/{uuid}-{name}" */
  key: string;
  /** Original file name as supplied by the caller */
  name: string;
  size: number;
  mime_type: string;
  uploaded_at: string; // ISO-8601
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface StorageClient {
  /**
   * Upload a file belonging to a deal.
   * Returns metadata including the immutable storage key.
   */
  putFile(
    dealId: string,
    data: Buffer | Uint8Array,
    name: string,
    mimeType: string
  ): Promise<UploadedFile>;

  /**
   * Return a pre-signed URL for a stored file.
   * Defaults to 3600-second expiry.
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /** List all files attached to a deal, newest-first. */
  listDealFiles(dealId: string): Promise<UploadedFile[]>;
}
