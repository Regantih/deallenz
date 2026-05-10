/**
 * StorageClient — abstract file-storage interface.
 *
 * Real Supabase Storage implementation lands in PR#2.
 * Mock implementation: lib/storage.mock.ts
 *
 * Import guard: MockStorageClient throws if NODE_ENV === 'production'
 * AND USE_MOCKS !== 'true'.
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
