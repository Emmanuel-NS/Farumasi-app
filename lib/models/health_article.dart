import '../api/repositories/patient_repository.dart';

class HealthArticle {
  final String id;
  final String slug;
  final String title;
  final String subtitle;
  final String summary;
  final String fullContent;
  final String imageUrl;
  final String? videoUrl;
  final String source;
  final String category;
  final List<String> categories;
  final String articleType;
  final int readTimeMin;
  final DateTime? publishedAt;
  final int viewCount;
  final int likeCount;
  final int shareCount;
  final int commentCount;
  final bool isLiked;
  final bool isSaved;

  const HealthArticle({
    required this.id,
    this.slug = '',
    required this.title,
    required this.subtitle,
    required this.summary,
    required this.fullContent,
    required this.imageUrl,
    this.videoUrl,
    required this.source,
    required this.category,
    this.categories = const [],
    this.articleType = 'article',
    this.readTimeMin = 5,
    this.publishedAt,
    this.viewCount = 0,
    this.likeCount = 0,
    this.shareCount = 0,
    this.commentCount = 0,
    this.isLiked = false,
    this.isSaved = false,
  });

  factory HealthArticle.fromPatientArticle(PatientArticle a) {
    return HealthArticle(
      id: a.id,
      slug: a.slug,
      title: a.title,
      subtitle: a.summary.isNotEmpty ? a.summary : a.category,
      summary: a.summary,
      fullContent: a.content.isNotEmpty ? a.content : a.summary,
      imageUrl: a.imageUrl ??
          'https://images.unsplash.com/photo-1505751172870-fa1923c5c528?w=800&q=80',
      videoUrl: a.videoUrl,
      source: 'Farumasi',
      category: a.category,
      categories: a.categories,
      articleType: a.articleType,
      readTimeMin: a.readTimeMin,
      publishedAt: a.publishedAt,
      viewCount: a.viewCount,
      likeCount: a.likeCount,
      shareCount: a.shareCount,
      commentCount: a.commentCount,
      isLiked: a.isLiked,
      isSaved: a.isSaved,
    );
  }

  HealthArticle copyWith({
    String? slug,
    String? title,
    String? subtitle,
    String? summary,
    String? fullContent,
    String? imageUrl,
    String? videoUrl,
    String? source,
    String? category,
    List<String>? categories,
    String? articleType,
    int? readTimeMin,
    DateTime? publishedAt,
    int? viewCount,
    int? likeCount,
    int? shareCount,
    int? commentCount,
    bool? isLiked,
    bool? isSaved,
  }) {
    return HealthArticle(
      id: id,
      slug: slug ?? this.slug,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      summary: summary ?? this.summary,
      fullContent: fullContent ?? this.fullContent,
      imageUrl: imageUrl ?? this.imageUrl,
      videoUrl: videoUrl ?? this.videoUrl,
      source: source ?? this.source,
      category: category ?? this.category,
      categories: categories ?? this.categories,
      articleType: articleType ?? this.articleType,
      readTimeMin: readTimeMin ?? this.readTimeMin,
      publishedAt: publishedAt ?? this.publishedAt,
      viewCount: viewCount ?? this.viewCount,
      likeCount: likeCount ?? this.likeCount,
      shareCount: shareCount ?? this.shareCount,
      commentCount: commentCount ?? this.commentCount,
      isLiked: isLiked ?? this.isLiked,
      isSaved: isSaved ?? this.isSaved,
    );
  }
}
