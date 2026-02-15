import 'package:flutter/material.dart';

class PrescriptionUploadScreen extends StatefulWidget {
  const PrescriptionUploadScreen({super.key});

  @override
  State<PrescriptionUploadScreen> createState() => _PrescriptionUploadScreenState();
}

class _PrescriptionUploadScreenState extends State<PrescriptionUploadScreen> {
  bool _isUploading = false;
  bool _uploaded = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Upload Prescription', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black)),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(24),
          child: _uploaded ? _buildSuccessView() : _buildUploadView(),
        ),
      ),
    );
  }

  Widget _buildUploadView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Hero Image / Illustration area
        Container(
          height: 200,
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.green.shade100),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.document_scanner_rounded, size: 64, color: Colors.green.shade300),
              SizedBox(height: 16),
              Text("Scan or Photo", style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold))
            ],
          ),
        ),
        SizedBox(height: 32),
        Text(
          "Have a written prescription?", 
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 12),
        Text(
          "Upload a clear photo of your doctor's prescription to order medicines that require approval.",
          style: TextStyle(fontSize: 16, color: Colors.grey.shade600, height: 1.5),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 32),
        
        // Upload Buttons
        if (_isUploading)
          Center(
            child: Column(
              children: [
                CircularProgressIndicator(color: Colors.green),
                SizedBox(height: 16),
                Text("Uploading...", style: TextStyle(color: Colors.grey)),
              ],
            ),
          )
        else
          Column(
            children: [
              ElevatedButton.icon(
                onPressed: () => _simulateUpload("Camera"),
                icon: Icon(Icons.camera_alt),
                label: Text("Take Photo"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(vertical: 16),
                  minimumSize: Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                  textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)
                ),
              ),
              SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => _simulateUpload("Gallery"),
                icon: Icon(Icons.photo_library),
                label: Text("Upload from Gallery"),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.green,
                  side: BorderSide(color: Colors.green),
                  padding: EdgeInsets.symmetric(vertical: 16),
                  minimumSize: Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)
                ),
              ),
            ],
          ),
          
        SizedBox(height: 40),
        // Instructions
        Container(
          padding: EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(16)
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Requirements:", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black54)),
              SizedBox(height: 12),
              _buildInstructionRow(Icons.visibility, "Doctor's handwriting must be legible."),
              SizedBox(height: 12),
              _buildInstructionRow(Icons.person, "Patient name & doctor's signature visible."),
              SizedBox(height: 12),
              _buildInstructionRow(Icons.calendar_today, "Prescription date must be valid."),
            ],
          ),
        )
      ],
    );
  }

  Widget _buildSuccessView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(height: 40),
        Container(
          height: 120,
          width: 120,
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.check_circle, size: 80, color: Colors.green),
        ),
        SizedBox(height: 32),
        Text(
          "Prescription Received!", 
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green.shade800),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 16),
        Text(
          "Our pharmacists will verify your prescription shortly.\nYou will be notified once it is approved.",
          style: TextStyle(fontSize: 16, color: Colors.grey.shade600, height: 1.5),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 48),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text("We've received your prescription!"),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
            padding: EdgeInsets.symmetric(vertical: 16),
            minimumSize: Size(double.infinity, 56),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: Text("Continue Shopping", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildInstructionRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.green.shade700),
        SizedBox(width: 12),
        Expanded(child: Text(text, style: TextStyle(color: Colors.grey.shade700, fontSize: 13, height: 1.4))),
      ],
    );
  }

  void _simulateUpload(String source) async {
    setState(() => _isUploading = true);
    // Simulate network delay
    await Future.delayed(Duration(seconds: 2));
    if (mounted) {
      setState(() {
        _isUploading = false;
        _uploaded = true;
      });
    }
  }
}
