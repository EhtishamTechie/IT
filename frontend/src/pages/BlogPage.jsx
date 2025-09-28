import { useState, useEffect, useMemo, useCallback } from "react";

// Mock blog data
const mockBlogPosts = [
  {
    id: "1",
    title: "The Future of E-commerce: 2024 Trends and Predictions",
    excerpt: "Explore the latest trends shaping the e-commerce landscape, from AI-powered personalization to sustainable shopping practices.",
    author: {
      name: "Sarah Ahmed",
      role: "CEO & Founder"
    },
    category: "Industry Insights",
    tags: ["E-commerce", "Technology", "AI"],
    publishDate: "2024-06-10",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop&q=80",
    featured: true,
    views: 12547
  },
  {
    id: "2",
    title: "Building Trust in Global E-commerce: Security Best Practices",
    excerpt: "Learn how International Tijarat maintains the highest security standards to protect customer data and ensure safe transactions.",
    author: {
      name: "Michael Chen",
      role: "CTO"
    },
    category: "Security",
    tags: ["Security", "Trust", "Data Protection"],
    publishDate: "2024-06-08",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop&q=80",
    featured: false,
    views: 8934
  },
  {
    id: "3",
    title: "Sustainable Shopping: How to Make Eco-Friendly Choices Online",
    excerpt: "Discover practical tips for sustainable online shopping and learn how we support environmental responsibility.",
    author: {
      name: "Fatima Khan",
      role: "Head of Operations"
    },
    category: "Sustainability",
    tags: ["Sustainability", "Environment", "Green Shopping"],
    publishDate: "2024-06-05",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=600&fit=crop&q=80",
    featured: true,
    views: 15673
  },
  {
    id: "4",
    title: "International Shipping Made Simple: A Complete Guide",
    excerpt: "Navigate the complexities of international shipping with our comprehensive guide covering customs, duties, and delivery.",
    author: {
      name: "David Rodriguez",
      role: "Head of Marketing"
    },
    category: "Shipping Guide",
    tags: ["Shipping", "International", "Logistics"],
    publishDate: "2024-06-03",
    readTime: "10 min read",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80",
    featured: false,
    views: 9876
  },
  {
    id: "5",
    title: "Product Authentication: How We Ensure Quality and Authenticity",
    excerpt: "Go behind the scenes to discover our rigorous product authentication process and quality assurance measures.",
    author: {
      name: "Sarah Ahmed",
      role: "CEO & Founder"
    },
    category: "Quality Assurance",
    tags: ["Quality", "Authentication", "Trust"],
    publishDate: "2024-06-01",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&q=80",
    featured: false,
    views: 11234
  },
  {
    id: "6",
    title: "Mobile Commerce Revolution: Shopping on the Go",
    excerpt: "Explore how mobile commerce is transforming the shopping experience with the latest mobile features.",
    author: {
      name: "Michael Chen",
      role: "CTO"
    },
    category: "Technology",
    tags: ["Mobile Commerce", "Technology", "User Experience"],
    publishDate: "2024-05-28",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop&q=80",
    featured: false,
    views: 7654
  }
];

const categories = [
  "All Categories",
  "Industry Insights", 
  "Technology",
  "Security",
  "Sustainability",
  "Shipping Guide",
  "Quality Assurance"
];

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

// Blog Card Component
const BlogCard = ({ post, featured = false }) => {
  const [imageError, setImageError] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (featured) {
    return (
      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 mb-8">
        <div className="md:flex">
          <div className="md:w-1/2">
            <div className="aspect-video md:h-64 bg-gray-100 overflow-hidden">
              {!imageError ? (
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="w-16 h-16 bg-gray-200 rounded"></div>
                </div>
              )}
            </div>
          </div>
          <div className="md:w-1/2 p-6">
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                {post.category}
              </span>
              <div className="flex items-center gap-1">
                <CalendarIcon />
                {formatDate(post.publishDate)}
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon />
                {post.readTime}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors cursor-pointer">
              {post.title}
            </h2>
            <p className="text-gray-600 mb-4 line-clamp-3">
              {post.excerpt}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-gray-700">
                    {post.author.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{post.author.name}</div>
                  <div className="text-gray-500 text-xs">{post.author.role}</div>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 transition-colors">
                Read More <ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="aspect-video bg-gray-100 overflow-hidden">
        {!imageError ? (
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="w-16 h-16 bg-gray-200 rounded"></div>
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
            {post.category}
          </span>
          <div className="flex items-center gap-1">
            <CalendarIcon />
            {formatDate(post.publishDate)}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors cursor-pointer line-clamp-2">
          {post.title}
        </h3>
        <p className="text-gray-600 mb-4 text-sm line-clamp-3">
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            <ClockIcon />
            <span className="ml-1">{post.readTime}</span>
          </div>
          <button className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 transition-colors">
            Read More <ArrowRightIcon />
          </button>
        </div>
      </div>
    </article>
  );
};

// Main Blog Page
const BlogPage = () => {
  const [posts] = useState(mockBlogPosts);
  const [filteredPosts, setFilteredPosts] = useState(mockBlogPosts);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const postsPerPage = 9;

  // Filter posts
  useEffect(() => {
    let filtered = posts;

    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredPosts(filtered);
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, posts]);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(startIndex, startIndex + postsPerPage);
  }, [filteredPosts, currentPage]);

  const featuredPost = useMemo(() => {
    return posts.find(post => post.featured);
  }, [posts]);

  const regularPosts = useMemo(() => {
    return paginatedPosts.filter(post => !post.featured);
  }, [paginatedPosts]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay updated with the latest insights, trends, and stories from the world of e-commerce
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="mt-4">
            <p className="text-gray-600">
              {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''} found
              {selectedCategory !== "All Categories" && (
                <span> in {selectedCategory}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto mb-8 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.206 0-4.206.896-5.657 2.343M16 21h-4a2 2 0 01-2-2V5a2 2 0 012-2h4a2 2 0 012 2v14a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No articles found</h3>
            <p className="text-gray-600 mb-8">
              {searchQuery ? `No articles match "${searchQuery}". Try different keywords.` : 
               selectedCategory !== "All Categories" ? `No articles found in ${selectedCategory}.` :
               "No articles available at the moment."}
            </p>
            <button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All Categories");
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Articles
            </button>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && currentPage === 1 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Article</h2>
                <BlogCard post={featuredPost} featured={true} />
              </div>
            )}

            {/* Regular Posts Grid */}
            {regularPosts.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {currentPage === 1 && featuredPost ? "More Articles" : "Articles"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {regularPosts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Newsletter Section */}
      <div className="bg-blue-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Stay Updated</h2>
          <p className="text-xl text-gray-600 mb-8">
            Get the latest articles delivered to your inbox
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>
        {`
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}
      </style>
    </div>
  );
};

export default BlogPage;