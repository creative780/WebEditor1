"use client";

import { post } from "./httpClient";

/**
 * Upload one or more files to the backend upload API.  The server will
 * persist the files and return an array of URLs pointing at the
 * uploaded resources.  These URLs are relative to the application root
 * (e.g. `/uploads/uuid-filename.png`).  If the upload fails the
 * returned promise will reject with an error.
 *
 * @param files An array of File objects selected by the user
 * @returns A promise resolving to an array of URL strings
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => {
    // Use the same field name for all files; the backend will
    // accumulate them via getAll("files").
    formData.append("files", file);
  });
  // POST to the upload API under the editor namespace.  Next.js
  // automatically maps app/editor/api/upload to /editor/api/upload.
  const data = await post<{ urls: string[] }>("/editor/api/upload", formData);
  return data?.urls ?? [];
}