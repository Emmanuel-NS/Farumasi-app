import 'package:file_picker/file_picker.dart';

/// Broad image extensions for gallery/file pickers (web + desktop).
const kPickableImageExtensions = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'heic',
  'heif',
  'tif',
  'tiff',
  'avif',
];

const kPickableDocumentExtensions = [
  'pdf',
  'doc',
  'docx',
  'txt',
  ...kPickableImageExtensions,
];

class PickedMediaBytes {
  const PickedMediaBytes({
    required this.bytes,
    required this.name,
    this.extension,
  });

  final List<int> bytes;
  final String name;
  final String? extension;

  bool get isPdf => extension?.toLowerCase() == 'pdf';

  bool get isImage {
    final ext = extension?.toLowerCase() ?? '';
    return kPickableImageExtensions.contains(ext);
  }
}

Future<PickedMediaBytes?> pickImageBytes() async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: kPickableImageExtensions,
    withData: true,
    allowMultiple: false,
  );
  if (result == null || result.files.isEmpty) return null;
  final file = result.files.single;
  final bytes = file.bytes;
  if (bytes == null || bytes.isEmpty) return null;
  return PickedMediaBytes(
    bytes: bytes,
    name: file.name,
    extension: file.extension,
  );
}

Future<PickedMediaBytes?> pickDocumentBytes() async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: kPickableDocumentExtensions,
    withData: true,
    allowMultiple: false,
  );
  if (result == null || result.files.isEmpty) return null;
  final file = result.files.single;
  final bytes = file.bytes;
  if (bytes == null || bytes.isEmpty) return null;
  return PickedMediaBytes(
    bytes: bytes,
    name: file.name,
    extension: file.extension,
  );
}
