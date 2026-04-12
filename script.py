import sys

file_path = 'lib/screens/home_screen.dart'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

old_block = '''          const SizedBox(height: 12),
          if (!_isSidebarCollapsed)
            Container(
              margin: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _shellGreenDark,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF2A6A53)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Quick Action',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFFBFE3D4),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.document_scanner_outlined, size: 18),
                      label: const Text('Upload Prescription'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        backgroundColor: const Color(0xFF47D196),
                        foregroundColor: const Color(0xFF0B2D20),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () {
                        if (!isLoggedIn) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Please log in to upload a prescription.'),
                              action: SnackBarAction(
                                label: 'Login',
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const AuthScreen()),
                                  );
                                },
                              ),
                            ),
                          );
                          return;
                        }
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const PrescriptionUploadScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          if (_isSidebarCollapsed)
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
              child: Tooltip(
                message: 'Upload Prescription',
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {
                      if (!isLoggedIn) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text('Please log in to upload a prescription.'),
                            action: SnackBarAction(
                              label: 'Login',
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const AuthScreen()),
                                );
                              },
                            ),
                          ),
                        );
                        return;
                      }
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const PrescriptionUploadScreen()),
                      );
                    },
                    child: Container(
                      height: 46,
                      decoration: BoxDecoration(
                        color: const Color(0x3347D196),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x6647D196)),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.document_scanner_outlined,
                          color: Color(0xFFEFFBF5),
                          size: 26,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),'''

new_block = '''          _buildDrawerItem(
            context,
            Icons.upload_file,
            'Upload Prescription',
            4,
            restricted: !isLoggedIn,
            restrictedMessage: 'Please log in to upload a prescription.',
            closeDrawerOnTap: false,
            collapsed: _isSidebarCollapsed,
            onTapOverride: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PrescriptionUploadScreen()),
              );
            },
          ),'''

if old_block in text:
    text = text.replace(old_block, new_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Update successful.")
else:
    print("Could not find the block block.")
