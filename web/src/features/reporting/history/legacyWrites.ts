/** Active legacy editors are retired. Privacy maintenance and advisor grants are separate contracts. */
export const LEGACY_ALIGNMENT_READ_ONLY = true;
export function assertLegacyAlignmentWritable(): never {
  throw new Error("legacy_alignment_read_only");
}
