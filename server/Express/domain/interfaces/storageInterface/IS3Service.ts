export interface IS3Service {
  uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<{ key: string; url: string }>;
}   