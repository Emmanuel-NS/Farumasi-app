import 'package:flutter/material.dart';

class PrescriptionUploadScreen extends StatefulWidget {
  const PrescriptionUploadScreen({super.key});

  @override
  State<PrescriptionUploadScreen> createState() => _PrescriptionUploadScreenState();
}

class _PrescriptionUploadScreenState extends State<PrescriptionUploadScreen> {
  bool _uploaded = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Upload Prescription')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                _uploaded ? Icons.check_circle : Icons.cloud_upload,
                size: 100,
                color: _uploaded ? Colors.green : Colors.grey,
              ),
              SizedBox(height: 20),
              Text(
                _uploaded ? 'Prescription Uploaded!' : 'Please upload your prescription image',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18),
              ),
              SizedBox(height: 30),
              if (!_uploaded)
                ElevatedButton.icon(
                  onPressed: () {
                    // Simulate upload
                    setState(() {
                      _uploaded = true;
                    });
                  },
                  icon: Icon(Icons.camera_alt),
                  label: Text('Select Image'),
                ),
              if (_uploaded)
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                  },
                  child: Text('Continue Shopping'),
                )
            ],
          ),
        ),
      ),
    );
  }
}
