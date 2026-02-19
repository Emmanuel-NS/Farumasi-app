import 'package:flutter/material.dart';

class PharmacistChatScreen extends StatefulWidget {
  const PharmacistChatScreen({Key? key}) : super(key: key);

  @override
  State<PharmacistChatScreen> createState() => _PharmacistChatScreenState();
}

class _PharmacistChatScreenState extends State<PharmacistChatScreen> {
  // Mock Data
  final List<ChatSession> _sessions = [
    ChatSession(
      id: "1",
      patientName: "Alice Uwase",
      lastMessage: "Is my order ready?",
      time: DateTime.now().subtract(const Duration(minutes: 5)),
      messages: [
        ChatMessage(text: "Hello, I sent my prescription.", isMe: false, time: DateTime.now().subtract(const Duration(hours: 1))),
        ChatMessage(text: "We received it. Reviewing now.", isMe: true, time: DateTime.now().subtract(const Duration(minutes: 50))),
        ChatMessage(text: "Is my order ready?", isMe: false, time: DateTime.now().subtract(const Duration(minutes: 5))),
      ],
    ),
    ChatSession(
      id: "2",
      patientName: "John Mugabo",
      lastMessage: "Thanks!",
      time: DateTime.now().subtract(const Duration(hours: 2)),
      messages: [
        ChatMessage(text: "Do you have Amoxicillin?", isMe: false, time: DateTime.now().subtract(const Duration(hours: 3))),
        ChatMessage(text: "Yes, but you need a prescription.", isMe: true, time: DateTime.now().subtract(const Duration(hours: 2, minutes: 55))),
        ChatMessage(text: "Okay, I will upload it.", isMe: false, time: DateTime.now().subtract(const Duration(hours: 2, minutes: 50))),
        ChatMessage(text: "Thanks!", isMe: false, time: DateTime.now().subtract(const Duration(hours: 2))),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Patient Chats")),
      body: ListView.builder(
        itemCount: _sessions.length,
        itemBuilder: (context, index) {
          final session = _sessions[index];
          return ListTile(
            leading: CircleAvatar(child: Text(session.patientName[0])),
            title: Text(session.patientName),
            subtitle: Text(session.lastMessage, maxLines: 1, overflow: TextOverflow.ellipsis),
            trailing: Text(
              "${session.time.hour}:${session.time.minute.toString().padLeft(2,'0')}", 
              style: const TextStyle(fontSize: 12, color: Colors.grey)
            ),
            onTap: () {
              Navigator.push(
                context, 
                MaterialPageRoute(builder: (_) => ChatDetailScreen(session: session))
              );
            },
          );
        },
      ),
    );
  }
}

class ChatDetailScreen extends StatefulWidget {
  final ChatSession session;
  const ChatDetailScreen({Key? key, required this.session}) : super(key: key);

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _controller = TextEditingController();

  void _sendMessage() {
    if (_controller.text.isEmpty) return;
    setState(() {
      widget.session.messages.add(
        ChatMessage(
          text: _controller.text, 
          isMe: true, 
          time: DateTime.now()
        )
      );
    });
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.session.patientName)),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: widget.session.messages.length,
              itemBuilder: (context, index) {
                final msg = widget.session.messages[index];
                return Align(
                  alignment: msg.isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: msg.isMe ? Colors.teal : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      msg.text,
                      style: TextStyle(color: msg.isMe ? Colors.white : Colors.black),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: "Type a detailed reply...", 
                      border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(24)))
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send, color: Colors.teal),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

// Simple Models for Chat
class ChatMessage {
  final String text;
  final bool isMe;
  final DateTime time;
  ChatMessage({required this.text, required this.isMe, required this.time});
}

class ChatSession {
  final String id;
  final String patientName;
  final String lastMessage;
  final DateTime time;
  final List<ChatMessage> messages;

  ChatSession({
    required this.id, 
    required this.patientName, 
    required this.lastMessage, 
    required this.time,
    required this.messages
  });
}
