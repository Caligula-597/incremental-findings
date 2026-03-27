const MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024;
const MAX_SUPPORTING_BYTES = 100 * 1024 * 1024;

export type UploadKind = 'manuscript' | 'cover_letter' | 'supporting';

const blockedExtensions = new Set(['.exe', '.dll', '.bat', '.cmd', '.sh', '.js', '.jar', '.msi', '.com', '.scr']);

const allowedExtensionsByKind: Record<UploadKind, Set<string>> = {
  manuscript: new Set(['.pdf']),
  cover_letter: new Set(['.pdf', '.doc', '.docx']),
  supporting: new Set(['.pdf', '.doc', '.docx', '.csv', '.xlsx', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.zip'])
};

const allowedMimeByExtension: Record<string, Set<string>> = {
  '.pdf': new Set(['application/pdf']),
  '.doc': new Set(['application/msword']),
  '.docx': new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  '.csv': new Set(['text/csv', 'application/csv']),
  '.xlsx': new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  '.png': new Set(['image/png']),
  '.jpg': new Set(['image/jpeg']),
  '.jpeg': new Set(['image/jpeg']),
  '.tif': new Set(['image/tiff']),
  '.tiff': new Set(['image/tiff']),
  '.zip': new Set(['application/zip', 'application/x-zip-compressed'])
};

function getExtension(fileName: string) {
  const value = fileName.trim().toLowerCase();
  const index = value.lastIndexOf('.');
  if (index <= 0 || index === value.length - 1) {
    return '';
  }
  return value.slice(index);
}

export function validateFileUploadPolicy(file: File, kind: UploadKind): string | null {
  const fileName = String(file.name ?? '').trim();
  if (!fileName) {
    return 'File name is required';
  }

  if (fileName.includes('/') || fileName.includes('\\')) {
    return 'File name cannot contain path separators';
  }

  const extension = getExtension(fileName);
  if (!extension) {
    return 'File extension is required';
  }

  if (blockedExtensions.has(extension)) {
    return `File extension ${extension} is not allowed`;
  }

  const allowedExt = allowedExtensionsByKind[kind];
  if (!allowedExt.has(extension)) {
    return `${kind} file type ${extension} is not allowed`;
  }

  if ((kind === 'manuscript' || kind === 'cover_letter') && file.size > MAX_MANUSCRIPT_BYTES) {
    return `${kind} file exceeds 50MB limit`;
  }

  if (kind === 'supporting' && file.size > MAX_SUPPORTING_BYTES) {
    return 'Supporting file exceeds 100MB limit';
  }

  const mime = String(file.type ?? '').trim().toLowerCase();
  if (mime) {
    const allowedMimes = allowedMimeByExtension[extension];
    if (allowedMimes && !allowedMimes.has(mime)) {
      return `${kind} MIME type ${mime} does not match extension ${extension}`;
    }
  }

  return null;
}
