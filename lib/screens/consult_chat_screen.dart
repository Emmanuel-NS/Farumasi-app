import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../models/models.dart';

class ConsultChatScreen extends StatefulWidget {
  const ConsultChatScreen({super.key});

  @override
  State<ConsultChatScreen> createState() => _ConsultChatScreenState();
}

class _ConsultChatScreenState extends State<ConsultChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Message> _messages = [];

  @override
  void initState() {
    super.initState();
    // Add dummy initial messages
    _messages.addAll([
      Message(
        id: '1',
        senderId: 'pharmacist',
        content: 'Hello! I am a pharmacist on duty. How can I help you today?',
        timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        isMe: false,
      ),
    ]);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);

    if (pickedFile != null) {
      _sendAttachment(pickedFile.path, 'image');
    }
  }

  Future<void> _pickDocument() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles();

    if (result != null) {
      // On web, path might be null or unsupported by dart:io File
      // However, we just need a path or identifier to put in the message attachmentPath
      // so we use the file name or a generic identifier if path is unavailable.
      String? path = result.files.single.path;
      if (kIsWeb) {
        // file_picker on web doesn't provide a reliable path for `File`.
        // We'll just use the file name as a visual placeholder since we aren't uploading it yet.
        path = result.files.single.name;
      }
      if (path != null) {
        _sendAttachment(path, 'file');
      }
    }
  }

  void _sendAttachment(String path, String type) {
    setState(() {
      _messages.add(
        Message(
          id: DateTime.now().toString(),
          senderId: 'user',
          content: '',
          timestamp: DateTime.now(),
          isMe: true,
          attachmentPath: path,
          attachmentType: type,
        ),
      );
    });
    _scrollToBottom();
    _simulateResponse();
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        height: 150,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            Column(
              children: [
                IconButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _pickImage(ImageSource.camera);
                  },
                  icon: const Icon(
                    Icons.camera_alt,
                    size: 30,
                    color: const Color(0xFF1E9E68),
                  ),
                ),
                const Text('Camera'),
              ],
            ),
            Column(
              children: [
                IconButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _pickImage(ImageSource.gallery);
                  },
                  icon: const Icon(Icons.photo, size: 30, color: Colors.blue),
                ),
                const Text('Gallery'),
              ],
            ),
            Column(
              children: [
                IconButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _pickDocument();
                  },
                  icon: const Icon(
                    Icons.insert_drive_file,
                    size: 30,
                    color: Colors.orange,
                  ),
                ),
                const Text('Document'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _simulateResponse() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _messages.add(
            Message(
              id: DateTime.now().toString(),
              senderId: 'pharmacist',
              content: 'I am reviewing your message and will reply shortly.',
              timestamp: DateTime.now(),
              isMe: false,
            ),
          );
        });
        _scrollToBottom();
      }
    });
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    final text = _messageController.text.trim();
    _messageController.clear();

    setState(() {
      _messages.add(
        Message(
          id: DateTime.now().toString(),
          senderId: 'user',
          content: text,
          timestamp: DateTime.now(),
          isMe: true,
        ),
      );
    });

    _scrollToBottom();
    _simulateResponse();
  }

  Widget _buildMessageBubble(Message message) {
    // Format timestamp nicely
    final timeStr = '${message.timestamp.hour.toString().padLeft(2, '0')}:${message.timestamp.minute.toString().padLeft(2, '0')}';

    return Align(
      alignment: message.isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: message.isMe ? const Color(0xFF1E9E68) : Colors.white,
          border: message.isMe ? null : Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: message.isMe
                ? const Radius.circular(16)
                : const Radius.circular(0),
            bottomRight: message.isMe
                ? const Radius.circular(0)
                : const Radius.circular(16),
          ),
          boxShadow: [
             BoxShadow(
               color: Colors.black.withOpacity(0.05),
               blurRadius: 2,
               offset: const Offset(0, 1),
             ),
          ],
        ),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message.attachmentPath != null)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                constraints: const BoxConstraints(
                  maxHeight: 300,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.black12,
                ),
                clipBehavior: Clip.hardEdge,
                child: message.attachmentType == 'image'
                    ? (kIsWeb
                        ? Image.network(
                            message.attachmentPath!,
                            fit: BoxFit.contain,
                          )
                        : Image.file(
                            File(message.attachmentPath!),
                            fit: BoxFit.contain,
                          ))
                    : const Padding(
                        padding: EdgeInsets.all(24.0),
                        child: Center(
                          child: Icon(
                            Icons.insert_drive_file,
                            size: 50,
                            color: Colors.grey,
                          ),
                        ),
                      ),
              ),
            if (message.content.isNotEmpty)
              Text(
                message.content,
                style: TextStyle(
                  color: message.isMe ? Colors.white : Colors.black87,
                  fontSize: 15,
                ),
              ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  timeStr,
                  style: TextStyle(
                    fontSize: 11,
                    color: message.isMe ? Colors.white70 : Colors.black54,
                  ),
                ),
                if (message.isMe) ...[
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.done_all,
                    size: 14,
                    color: Colors.white70,
                  ),
                ]
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            CircleAvatar(
              backgroundColor: Colors.white,
              child: Icon(Icons.local_pharmacy, color: Color(0xFF1E9E68)),
            ),
            SizedBox(width: 8),
            Text('Consult a Pharmacist'),
          ],
        ),
        backgroundColor: const Color(0xFF1E9E68),
        foregroundColor: Colors.white,
      ),
      body: Container(
        color: const Color(0xFFE5DDD5), // WhatsApp-like background color
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  return _buildMessageBubble(_messages[index]);
                },
              ),
            ),
            Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.1),
                  offset: const Offset(0, -1),
                  blurRadius: 4,
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    onPressed: _showAttachmentOptions,
                    icon: const Icon(
                      Icons.attach_file,
                      color: Color(0xFF1E9E68),
                    ),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: Colors.grey[100],
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: const Color(0xFF1E9E68),
                    child: IconButton(
                      onPressed: _sendMessage,
                      icon: const Icon(Icons.send, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }
}
