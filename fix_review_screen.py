import sys

with open('lib/screens/pharmacist/prescription_review_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

constructor_old = '''class PrescriptionReviewScreen extends StatefulWidget {
  final PrescriptionOrder order;

  const PrescriptionReviewScreen({super.key, required this.order});'''

constructor_new = '''class PrescriptionReviewScreen extends StatefulWidget {
  final PrescriptionOrder order;
  final VoidCallback? onCancel;
  final VoidCallback? onComplete;

  const PrescriptionReviewScreen({super.key, required this.order, this.onCancel, this.onComplete});'''

text = text.replace(constructor_old, constructor_new)

scaffold_old = '''    String typeLabel = widget.order.prescriptionImageUrl != null ? "Request" : "Order";
    return Scaffold(
      appBar: AppBar(
        title: Text('$typeLabel #${widget.order.id}'),
      ),
      body: SingleChildScrollView('''

scaffold_new = '''    String typeLabel = widget.order.prescriptionImageUrl != null ? "Request" : "Order";
    return Container(
      color: Colors.grey.shade50,
      child: SingleChildScrollView('''

text = text.replace(scaffold_old, scaffold_new)

# we need to remove the trailing ');' for Scaffold.
lines = text.split('\n')
for i in range(len(lines)):
    if '  Widget _buildPrescriptionForm(BuildContext context)' in lines[i]:
        # go lines back until we find );
        for j in range(i-1, i-5, -1):
            if lines[j].strip() == ');':
                # this is the end of SingleChildScrollView, meaning Scaffold had no padding properties after body:
                break
            if lines[j].strip() == ');' or lines[j].strip() == '();':
                pass # wait, Scaffold usually closes with );

        break

import re
text = re.sub(r'(\s+)\);\s+Widget _buildPrescriptionForm', r'\1;\n\n  Widget _buildPrescriptionForm', text)

with open('lib/screens/pharmacist/prescription_review_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Replaced Scaffold with Container!')
