import sys
import re

file_path = 'lib/screens/health_tips_screen.dart'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Add import
    if 'responsive_web_wrapper.dart' not in text:
        text = text.replace(\"import 'package:flutter/material.dart';\", \"import 'package:flutter/material.dart';\nimport 'package:farumasi_app/widgets/responsive_web_wrapper.dart';\")

    # Replace ListView with a responsive Grid / layout
    old_list_view = '''    return ListView.separated(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: EdgeInsets.all(20),
      itemCount: items.length,
      separatorBuilder: (c, i) => SizedBox(height: 20),
      itemBuilder: (context, index) {
        final item = items[index];
        if (isFact) return _DidYouKnowCard(article: item);
        return _ModernArticleCard(article: item);
      },
    );'''

    new_list_view = '''    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth > 700) {
          return GridView.builder(
            padding: const EdgeInsets.all(20),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 400,
              mainAxisSpacing: 20,
              crossAxisSpacing: 20,
              childAspectRatio: 0.8, // Adjust as needed
            ),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              if (isFact) return _DidYouKnowCard(article: item);
              return _ModernArticleCard(article: item);
            },
          );
        }
        return ListView.separated(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(20),
          itemCount: items.length,
          separatorBuilder: (c, i) => const SizedBox(height: 20),
          itemBuilder: (context, index) {
            final item = items[index];
            if (isFact) return _DidYouKnowCard(article: item);
            return _ModernArticleCard(article: item);
          },
        );
      },
    );'''

    text = text.replace(old_list_view, new_list_view)

    # Wrap Scaffold with ResponsiveWebWrapper
    # Find child: Scaffold( ... Wait, looking at the code around line 230: child: Scaffold(... Wait, is it inside PopScope or something?
    # Let's find exactly the Scaffold and do a regex.
    text = re.sub(r'(return\s+Scaffold\()', r'return ResponsiveWebWrapper(child: Scaffold(', text)
    # The snippet showed child: Scaffold(. So maybe it's child: Scaffold( => child: ResponsiveWebWrapper(child: Scaffold(
    text = re.sub(r'(\bchild:\s+Scaffold\()', r'child: ResponsiveWebWrapper(child: Scaffold(', text)


    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Updated HealthTipsScreen')
except Exception as e:
    print(e)
