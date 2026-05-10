import sys

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace row with wrap for the header
text = text.replace(
'''          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Order ', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Placed on ', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.print, size: 18),
                    label: const Text('Print Invoice'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      _showAdvanceStatusDialog(order);
                    },
                    icon: const Icon(Icons.arrow_forward),
                    label: const Text('Update Status'),
                    style: ElevatedButton.styleFrom(backgroundColor: _primaryGreen, foregroundColor: Colors.white),
                  ),
                ],
              ),
            ],
          ),''',
'''          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 16,
            runSpacing: 16,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Order ${order.id}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Placed on ${order.date.toString().substring(0, 16)}', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.print, size: 18),
                    label: const Text('Print Invoice'),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      _showAdvanceStatusDialog(order);
                    },
                    icon: const Icon(Icons.arrow_forward),
                    label: const Text('Update Status'),
                    style: ElevatedButton.styleFrom(backgroundColor: _primaryGreen, foregroundColor: Colors.white),
                  ),
                ],
              ),
            ],
          ),'''
)


text = text.replace(
    '''          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Customer & Delivery Info
              Expanded(
                flex: 1,''',
    '''          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Customer & Delivery Info
              // Removed Expanded
              '''
)

text = text.replace(
    '''              ),
              const SizedBox(width: 24),
              // Items & Pricing
              Expanded(
                flex: 2,''',
    '''              // Separator
              const SizedBox(height: 24),
              // Items & Pricing
              '''
)

text = text.replace(
    "Text('RWF ', style: const TextStyle(fontWeight: FontWeight.bold)),",
    "Text('RWF ${i.price.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),"
)
text = text.replace("Text('RWF '),", "Text('RWF ${order.pharmacyPrice.toStringAsFixed(0)}'),", 1)
text = text.replace("Text('RWF '),", "Text('RWF ${order.deliveryFee.toStringAsFixed(0)}'),", 1)
text = text.replace(
    "Text('RWF ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: _primaryGreen)),",
    "Text('RWF ${order.totalPrice.toStringAsFixed(0)}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: _primaryGreen)),"
)

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done in python script!')
