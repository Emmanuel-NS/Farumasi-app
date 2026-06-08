import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/repositories/auth_repository.dart';
import '../providers/auth_provider.dart';
import '../services/state_service.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  bool _isEditing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    _nameController = TextEditingController(text: user?.name ?? StateService().userName ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');
    _phoneController = TextEditingController(text: user?.phone ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final updated = await AuthRepository().updateMe(
        fullName: _nameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
      );
      StateService().login(updated.email ?? updated.phone ?? 'user', name: updated.name);
      if (mounted) {
        setState(() {
          _isEditing = false;
          _saving = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save profile: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    if (user != null && !_isEditing) {
      if (_nameController.text != user.name) _nameController.text = user.name;
      if ((user.email ?? '') != _emailController.text) {
        _emailController.text = user.email ?? '';
      }
      if ((user.phone ?? '') != _phoneController.text) {
        _phoneController.text = user.phone ?? '';
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: const Color(0xFF1E9E68),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(_isEditing ? Icons.save : Icons.edit),
            onPressed: _saving
                ? null
                : () {
                    if (_isEditing) {
                      _saveProfile();
                    } else {
                      setState(() => _isEditing = true);
                    }
                  },
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1000),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: const Color(0xFFEDFDF6),
                    child: Text(
                      (_nameController.text.isNotEmpty ? _nameController.text[0] : 'U').toUpperCase(),
                      style: const TextStyle(fontSize: 32, color: Color(0xFF1E9E68), fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _nameController,
                    enabled: _isEditing,
                    decoration: const InputDecoration(labelText: 'Full name', border: OutlineInputBorder()),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Name required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _emailController,
                    enabled: _isEditing,
                    decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _phoneController,
                    enabled: _isEditing,
                    decoration: const InputDecoration(labelText: 'Phone', border: OutlineInputBorder()),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
