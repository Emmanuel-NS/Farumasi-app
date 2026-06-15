/// Consult chat attachment helpers — keep product vs image vs file distinct.

final _productPath = RegExp(r'/(?:store|inventory|products)/([^/?#]+)', caseSensitive: false);
final _uploadPath = RegExp(r'/uploads/', caseSensitive: false);
final _imageExt = RegExp(r'\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$', caseSensitive: false);

bool isUploadAttachmentUrl(String? url) {
  if (url == null || url.isEmpty) return false;
  return _uploadPath.hasMatch(url);
}

bool isProductAttachmentUrl(String? url) {
  if (url == null || url.isEmpty || isUploadAttachmentUrl(url)) return false;
  return _productPath.hasMatch(url);
}

String? consultProductPath(String? url) {
  if (url == null || !isProductAttachmentUrl(url)) return null;
  final match = _productPath.firstMatch(url);
  if (match == null) return null;
  return '/store/${match.group(1)}';
}

String? productIdFromPath(String? url) {
  final path = consultProductPath(url);
  if (path == null) return null;
  final match = RegExp(r'/store/([^/?#]+)', caseSensitive: false).firstMatch(path);
  return match?.group(1);
}

bool _isLikelyImageUrl(String url) {
  return url.startsWith('data:image/') ||
      url.startsWith('blob:') ||
      _imageExt.hasMatch(url) ||
      RegExp(r'/uploads/(?:images?|media)/', caseSensitive: false).hasMatch(url) ||
      (url.contains('res.cloudinary.com/') && url.contains('/image/'));
}

String? inferAttachmentType(String? url, String? declared) {
  if (url == null || url.isEmpty) return declared;

  const allowed = {'image', 'file', 'product'};
  final normalizedDeclared = allowed.contains(declared) ? declared : null;

  if (isUploadAttachmentUrl(url)) {
    if (normalizedDeclared == 'image' || normalizedDeclared == 'file') {
      return normalizedDeclared;
    }
    return _isLikelyImageUrl(url) ? 'image' : 'file';
  }

  if (isProductAttachmentUrl(url)) return 'product';
  if (normalizedDeclared == 'product') return 'product';
  if (normalizedDeclared == 'image') {
    return _isLikelyImageUrl(url) ? 'image' : 'file';
  }
  if (normalizedDeclared == 'file') return 'file';
  if (_isLikelyImageUrl(url)) return 'image';
  return 'file';
}
