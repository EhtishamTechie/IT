import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  Eye,
  Download,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { analyzeImageSEO, formatFileSize, imageSEOTips } from '../../utils/imageSEOUtils';

const ImageSEODashboard = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [seoAnalysis, setSEOAnalysis] = useState(null);
  const [expandedTips, setExpandedTips] = useState(false);

  // Mock data - In real implementation, this would come from API
  const mockProducts = [
    {
      _id: '1',
      name: 'Premium Wireless Headphones',
      category: 'Electronics',
      images: ['headphones-1.jpg', 'headphones-2.jpg'],
      altText: 'Premium wireless headphones',
      imagesSEOScore: 75,
      issues: ['Alt text could be more descriptive', 'Large file size']
    },
    {
      _id: '2',
      name: 'Organic Cotton T-Shirt',
      category: 'Fashion',
      images: ['tshirt-1.jpg'],
      altText: 'Organic cotton t-shirt - comfortable wear - International Tijarat',
      imagesSEOScore: 95,
      issues: []
    },
    {
      _id: '3',
      name: 'Smart Phone Case',
      category: 'Electronics',
      images: ['case-1.jpg', 'case-2.jpg', 'case-3.jpg'],
      altText: '',
      imagesSEOScore: 45,
      issues: ['Missing alt text', 'Non-SEO friendly filename', 'No product name in filename']
    }
  ];

  useEffect(() => {
    loadImageSEOData();
  }, []);

  const loadImageSEOData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setProducts(mockProducts);
        generateSEOAnalysis(mockProducts);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading image SEO data:', error);
      setLoading(false);
    }
  };

  const generateSEOAnalysis = (products) => {
    const totalProducts = products.length;
    const totalImages = products.reduce((sum, product) => sum + (product.images?.length || 0), 0);
    const averageScore = products.reduce((sum, product) => sum + product.imagesSEOScore, 0) / totalProducts;
    
    const issues = {
      missingAltText: products.filter(p => !p.altText || p.altText.length < 10).length,
      largeFileSize: products.filter(p => p.issues.some(issue => issue.includes('file size'))).length,
      poorFilenames: products.filter(p => p.issues.some(issue => issue.includes('filename'))).length,
      lowQuality: products.filter(p => p.imagesSEOScore < 60).length
    };

    setSEOAnalysis({
      totalProducts,
      totalImages,
      averageScore: Math.round(averageScore),
      issues,
      gradeDistribution: {
        A: products.filter(p => p.imagesSEOScore >= 90).length,
        B: products.filter(p => p.imagesSEOScore >= 80 && p.imagesSEOScore < 90).length,
        C: products.filter(p => p.imagesSEOScore >= 70 && p.imagesSEOScore < 80).length,
        D: products.filter(p => p.imagesSEOScore >= 60 && p.imagesSEOScore < 70).length,
        F: products.filter(p => p.imagesSEOScore < 60).length
      }
    });
  };

  // Filter and search logic
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply filter
    switch (selectedFilter) {
      case 'excellent':
        filtered = filtered.filter(p => p.imagesSEOScore >= 90);
        break;
      case 'good':
        filtered = filtered.filter(p => p.imagesSEOScore >= 70 && p.imagesSEOScore < 90);
        break;
      case 'needs-improvement':
        filtered = filtered.filter(p => p.imagesSEOScore < 70);
        break;
      case 'missing-alt':
        filtered = filtered.filter(p => !p.altText || p.altText.length < 10);
        break;
      default:
        break;
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [products, selectedFilter, searchTerm]);

  const getSEOGrade = (score) => {
    if (score >= 90) return { grade: 'A', color: 'green', bg: 'bg-green-100', text: 'text-green-800' };
    if (score >= 80) return { grade: 'B', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-800' };
    if (score >= 70) return { grade: 'C', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800' };
    if (score >= 60) return { grade: 'D', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-800' };
    return { grade: 'F', color: 'red', bg: 'bg-red-100', text: 'text-red-800' };
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading image SEO analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Image SEO Dashboard</h1>
          <p className="text-gray-600">Monitor and optimize image SEO across your products</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadImageSEOData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {seoAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Products"
            value={seoAnalysis.totalProducts}
            icon={ImageIcon}
            color="blue"
          />
          <StatCard
            title="Total Images"
            value={seoAnalysis.totalImages}
            icon={Camera}
            color="green"
          />
          <StatCard
            title="Average SEO Score"
            value={`${seoAnalysis.averageScore}%`}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            title="Needs Attention"
            value={seoAnalysis.issues.lowQuality}
            icon={AlertCircle}
            color="red"
          />
        </div>
      )}

      {/* SEO Grade Distribution */}
      {seoAnalysis && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Grade Distribution</h3>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(seoAnalysis.gradeDistribution).map(([grade, count]) => {
              const gradeInfo = getSEOGrade(grade === 'A' ? 95 : grade === 'B' ? 85 : grade === 'C' ? 75 : grade === 'D' ? 65 : 50);
              return (
                <div key={grade} className="text-center">
                  <div className={`w-16 h-16 rounded-full ${gradeInfo.bg} flex items-center justify-center mx-auto mb-2`}>
                    <span className={`text-2xl font-bold ${gradeInfo.text}`}>{grade}</span>
                  </div>
                  <p className="text-sm text-gray-600">{count} products</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Common Issues */}
      {seoAnalysis && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Issues</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="font-medium text-red-800">Missing Alt Text</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{seoAnalysis.issues.missingAltText}</p>
              <p className="text-sm text-red-600">products affected</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
                <span className="font-medium text-orange-800">Large File Size</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{seoAnalysis.issues.largeFileSize}</p>
              <p className="text-sm text-orange-600">products affected</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">Poor Filenames</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{seoAnalysis.issues.poorFilenames}</p>
              <p className="text-sm text-yellow-600">products affected</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Optimized</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {seoAnalysis.totalProducts - seoAnalysis.issues.lowQuality}
              </p>
              <p className="text-sm text-blue-600">products with good SEO</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Products</option>
              <option value="excellent">Excellent (90+)</option>
              <option value="good">Good (70-89)</option>
              <option value="needs-improvement">Needs Improvement (&lt;70)</option>
              <option value="missing-alt">Missing Alt Text</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-64"
            />
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Products ({filteredProducts.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredProducts.map((product) => {
            const gradeInfo = getSEOGrade(product.imagesSEOScore);
            return (
              <div key={product._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <span className="text-sm text-gray-500">({product.category})</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${gradeInfo.bg} ${gradeInfo.text}`}>
                        Grade {gradeInfo.grade}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-6 text-sm text-gray-600">
                      <span>{product.images?.length || 0} images</span>
                      <span>Alt text: {product.altText ? `"${product.altText.substring(0, 50)}..."` : 'Missing'}</span>
                    </div>
                    {product.issues.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {product.issues.map((issue, index) => (
                            <span key={index} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{product.imagesSEOScore}%</div>
                      <div className="text-sm text-gray-500">SEO Score</div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEO Tips */}
      <div className="bg-white rounded-lg shadow">
        <div
          className="p-6 cursor-pointer flex items-center justify-between"
          onClick={() => setExpandedTips(!expandedTips)}
        >
          <h3 className="text-lg font-semibold text-gray-900">Image SEO Best Practices</h3>
          <svg
            className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedTips ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {expandedTips && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(imageSEOTips).map(([category, tips]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium text-gray-900 capitalize">{category.replace(/([A-Z])/g, ' $1')}</h4>
                  <ul className="space-y-2">
                    {tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSEODashboard;