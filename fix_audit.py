import re

with open('lib/screens/pharmacist/settings/system_audit_logs_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

scaffold_code = """    return Scaffold(
      appBar: AppBar(
        title: const Text("System Audit Logs", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
        actions: [
          IconButton(icon: const Icon(Icons.download), onPressed: () {
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Exporting Logs to PDF...")));
          }),
        ],
      ),
      body: """

header_replacement = """    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   const Text("System Audit Logs", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 24)),
                   const SizedBox(height: 4),
                   Text("Track cross-system prescription operations securely", style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
                ],
              ),
              OutlinedButton.icon(
                onPressed: () {
                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Exporting Logs to PDF...")));
                },
                icon: const Icon(Icons.download),
                label: const Text("Export Logs"),
                style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF1E9E68), side: const BorderSide(color: const Color(0xFF1E9E68))),
              )
            ],
          ),
        ),
        Expanded(
          child: """

text = text.replace(scaffold_code, header_replacement)

# Fix the end bracket
text = text.replace("""              ],
            ),
          ),
        ],
      ),
    );
  }
}""", """              ],
            ),
          ),
        ],
      ),
        ),
      ],
    );
  }
}""")

with open('lib/screens/pharmacist/settings/system_audit_logs_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Patched audit screen')
