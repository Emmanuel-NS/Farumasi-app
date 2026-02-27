import 'package:flutter/material.dart';

// --- MODELS ---
enum SessionType { consultation, general }
enum SessionStatus { active, upcoming, completed }

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
  final SessionType type;
  final SessionStatus status;
  final bool isOnline;
  final DateTime? scheduledTime;

  ChatSession({
    required this.id, 
    required this.patientName, 
    required this.lastMessage, 
    required this.time,
    required this.messages,
    this.type = SessionType.general,
    this.status = SessionStatus.completed,
    this.isOnline = false,
    this.scheduledTime,
  });
}

class PharmacistChatScreen extends StatefulWidget {
  const PharmacistChatScreen({super.key});

  @override
  State<PharmacistChatScreen> createState() => _PharmacistChatScreenState();
}

class _PharmacistChatScreenState extends State<PharmacistChatScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<ChatSession> _sessions = [
    ChatSession(
      id: "1",
      patientName: "Alice Uwase",
      lastMessage: "Is my order ready?",
      time: DateTime.now().subtract(const Duration(minutes: 5)),
      type: SessionType.general,
      status: SessionStatus.active,
      isOnline: true,
      messages: [
        ChatMessage(text: "Hello, I sent my prescription.", isMe: false, time: DateTime.now().subtract(const Duration(hours: 1))),
        ChatMessage(text: "We received it. Reviewing now.", isMe: true, time: DateTime.now().subtract(const Duration(minutes: 50))),
        ChatMessage(text: "Is my order ready?", isMe: false, time: DateTime.now().subtract(const Duration(minutes: 5))),
      ],
    ),
    ChatSession(
      id: "2",
      patientName: "John Mugabo",
      lastMessage: "Looking forward to our session.",
      time: DateTime.now().subtract(const Duration(hours: 2)),
      type: SessionType.consultation,
      status: SessionStatus.upcoming,
      isOnline: false,
      scheduledTime: DateTime.now().add(const Duration(hours: 2)),
      messages: [
        ChatMessage(text: "I booked a consultation for today.", isMe: false, time: DateTime.now().subtract(const Duration(hours: 3))),
        ChatMessage(text: "Great, I have it on my schedule.", isMe: true, time: DateTime.now().subtract(const Duration(hours: 2, minutes: 55))),
        ChatMessage(text: "Looking forward to our session.", isMe: false, time: DateTime.now().subtract(const Duration(hours: 2))),
      ],
    ),
    ChatSession(
      id: "3",
      patientName: "Sarah Keza",
      lastMessage: "Thank you for the advice!",
      time: DateTime.now().subtract(const Duration(days: 1)),
      type: SessionType.consultation,
      status: SessionStatus.completed,
      isOnline: false,
      scheduledTime: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
      messages: [
        ChatMessage(text: "How should I take this medication?", isMe: false, time: DateTime.now().subtract(const Duration(days: 1, hours: 3))),
        ChatMessage(text: "Take it twice a day after meals.", isMe: true, time: DateTime.now().subtract(const Duration(days: 1, hours: 2, minutes: 50))),
        ChatMessage(text: "Thank you for the advice!", isMe: false, time: DateTime.now().subtract(const Duration(days: 1))),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final consultations = _sessions.where((s) => s.type == SessionType.consultation).toList();
    final generalChats = _sessions.where((s) => s.type == SessionType.general).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text("Patient Messages", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.green.shade800,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.green.shade800,
          tabs: const [
            Tab(text: "Consultations"),
            Tab(text: "General Inquiries"),
          ],
        ),
      ),
      backgroundColor: Colors.grey.shade50,
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildChatList(consultations),
          _buildChatList(generalChats),
        ],
      ),
    );
  }

  Widget _buildChatList(List<ChatSession> sessions) {
    if (sessions.isEmpty) {
      return const Center(child: Text("No messages here.", style: TextStyle(color: Colors.grey)));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: sessions.length,
      itemBuilder: (context, index) {
        final session = sessions[index];
        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.shade200)),
          child: InkWell(
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => ChatDetailScreen(session: session)));
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: session.type == SessionType.consultation ? Colors.blue.shade50 : Colors.green.shade50,
                        child: Text(
                          session.patientName[0],
                          style: TextStyle(
                            color: session.type == SessionType.consultation ? Colors.blue : Colors.green,
                            fontSize: 20,
                            fontWeight: FontWeight.bold
                          )
                        ),
                      ),
                      if (session.isOnline)
                        Positioned(
                          bottom: 0, right: 0,
                          child: Container(
                            width: 14, height: 14,
                            decoration: BoxDecoration(color: Colors.green, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                          ),
                        )
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(session.patientName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
                            Text(
                              "${session.time.hour}:${session.time.minute.toString().padLeft(2,'0')}", 
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500)
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        if (session.type == SessionType.consultation && session.scheduledTime != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              children: [
                                Icon(Icons.calendar_month, size: 14, color: Colors.orange.shade700),
                                const SizedBox(width: 4),
                                Text(
                                  _formatSchedule(session.scheduledTime!, session.status), 
                                  style: TextStyle(fontSize: 12, color: Colors.orange.shade700, fontWeight: FontWeight.bold)
                                ),
                              ],
                            ),
                          ),
                        Text(
                          session.lastMessage, 
                          maxLines: 1, 
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 13)
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _formatSchedule(DateTime t, SessionStatus status) {
    if (status == SessionStatus.completed) return "Completed";
    if (status == SessionStatus.active) return "Active Now";
    return "Scheduled: ${t.month}/${t.day} at ${t.hour}:${t.minute.toString().padLeft(2,'0')}";
  }
}

class ChatDetailScreen extends StatefulWidget {
  final ChatSession session;
  const ChatDetailScreen({super.key, required this.session});

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _controller = TextEditingController();

  void _sendMessage() {
    if (_controller.text.isEmpty) return;
    setState(() {
      widget.session.messages.add(
        ChatMessage(text: _controller.text, isMe: true, time: DateTime.now())
      );
      // Optional: scroll to bottom
    });
    _controller.clear();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: Colors.grey.shade200,
              child: Text(widget.session.patientName[0], style: const TextStyle(color: Colors.black87)),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.session.patientName, style: const TextStyle(color: Colors.black87, fontSize: 16, fontWeight: FontWeight.bold)),
                Text(
                  widget.session.isOnline ? "Online" : "Offline", 
                  style: TextStyle(color: widget.session.isOnline ? Colors.green : Colors.grey, fontSize: 12)
                ),
              ],
            ),
          ],
        ),
        actions: [
          if (widget.session.type == SessionType.consultation) ...[
            IconButton(
              icon: const Icon(Icons.videocam_outlined, color: Colors.black87),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Starting Video Call...")));
              }
            ),
            IconButton(
              icon: const Icon(Icons.call_outlined, color: Colors.black87),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Starting Audio Call...")));
              }
            ),
          ],
          IconButton(
            icon: const Icon(Icons.more_vert, color: Colors.black87),
            onPressed: () {}
          ),
        ],
      ),
      body: Column(
        children: [
          if (widget.session.type == SessionType.consultation)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              color: Colors.blue.shade50,
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue.shade700, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.session.status == SessionStatus.upcoming 
                        ? "Consultation is scheduled. You can reach out to prepare." 
                        : (widget.session.status == SessionStatus.active ? "You are in an active medical consultation session." : "This consultation has been completed."),
                      style: TextStyle(color: Colors.blue.shade800, fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
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
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    decoration: BoxDecoration(
                      color: msg.isMe ? Colors.green.shade800 : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: msg.isMe ? const Radius.circular(16) : Radius.zero,
                        bottomRight: msg.isMe ? Radius.zero : const Radius.circular(16),
                      ),
                      border: msg.isMe ? null : Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: msg.isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                      children: [
                        Text(
                          msg.text,
                          style: TextStyle(color: msg.isMe ? Colors.white : Colors.black87, fontSize: 15),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "${msg.time.hour}:${msg.time.minute.toString().padLeft(2,'0')}",
                          style: TextStyle(color: msg.isMe ? Colors.white70 : Colors.grey.shade500, fontSize: 10),
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          
          // Chat Input
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.attach_file, color: Colors.grey),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Attach Medical File clicked")));
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: InputDecoration(
                        hintText: "Type a detailed reply...", 
                        hintStyle: TextStyle(color: Colors.grey.shade400),
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.green.shade800,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 20),
                      onPressed: _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
