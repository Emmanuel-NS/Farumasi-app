import 'package:flutter/material.dart';
import '../data/dummy_data.dart';

class HealthTipsScreen extends StatelessWidget {
  const HealthTipsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Health Tips')),
      body: ListView.builder(
        padding: EdgeInsets.all(8),
        itemCount: dummyHealthTips.length,
        itemBuilder: (context, index) {
          final tip = dummyHealthTips[index];
          return Card(
            elevation: 4,
            margin: EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 150,
                  width: double.infinity,
                  color: Colors.green.shade100,
                  child: Image.network(
                    tip.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Icon(Icons.spa, size: 80, color: Colors.green);
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(tip.title, style: Theme.of(context).textTheme.titleLarge),
                      SizedBox(height: 8),
                      Text(tip.content),
                    ],
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }
}
