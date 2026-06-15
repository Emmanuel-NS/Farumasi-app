/// Normalize upload URLs returned by the API (relative or absolute Cloudinary/S3).

String normalizeUploadUrl(String url) {
  final trimmed = url.trim();
  if (trimmed.isEmpty) return trimmed;
  if (RegExp(r'^https?://', caseSensitive: false).hasMatch(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) return trimmed;
  return '/$trimmed';
}
