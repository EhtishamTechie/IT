import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Tag, Progress, Select, Input, Space, Tabs, Alert, Statistic, List, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, ExportOutlined, BugOutlined, CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import ImageSEODashboard from './ImageSEODashboard';

const { Option } = Select;
const { Search } = Input;
const { TabPane } = Tabs;

const SEODashboard = () => {
  const [loading, setLoading] = useState(false);
  const [seoData, setSeoData] = useState({
    overview: {
      totalProducts: 0,
      optimizedProducts: 0,
      totalCategories: 0,
      optimizedCategories: 0,
      totalImages: 0,
      optimizedImages: 0,
      overallScore: 0
    },
    products: [],
    categories: [],
    issues: [],
    recommendations: []
  });
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    sortBy: 'score'
  });

  useEffect(() => {
    fetchSEOData();
  }, []);

  const fetchSEOData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, imagesRes] = await Promise.all([
        axios.get('/api/seo/products/analyze'),
        axios.get('/api/seo/categories/analyze'),
        axios.get('/api/image-seo/analyze')
      ]);

      const productsData = productsRes.data;
      const categoriesData = categoriesRes.data;
      const imagesData = imagesRes.data;

      setSeoData({
        overview: {
          totalProducts: productsData.total || 0,
          optimizedProducts: productsData.optimized || 0,
          totalCategories: categoriesData.total || 0,
          optimizedCategories: categoriesData.optimized || 0,
          totalImages: imagesData.total || 0,
          optimizedImages: imagesData.optimized || 0,
          overallScore: calculateOverallScore(productsData, categoriesData, imagesData)
        },
        products: productsData.products || [],
        categories: categoriesData.categories || [],
        issues: [...(productsData.issues || []), ...(categoriesData.issues || []), ...(imagesData.issues || [])],
        recommendations: generateRecommendations(productsData, categoriesData, imagesData)
      });
    } catch (error) {
      console.error('Error fetching SEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = (products, categories, images) => {
    const productScore = products.total > 0 ? (products.optimized / products.total) * 100 : 0;
    const categoryScore = categories.total > 0 ? (categories.optimized / categories.total) * 100 : 0;
    const imageScore = images.total > 0 ? (images.optimized / images.total) * 100 : 0;
    
    return Math.round((productScore + categoryScore + imageScore) / 3);
  };

  const generateRecommendations = (products, categories, images) => {
    const recommendations = [];
    
    if (products.total > 0 && (products.optimized / products.total) < 0.8) {
      recommendations.push({
        type: 'products',
        priority: 'high',
        message: 'Optimize product SEO metadata for better search visibility',
        action: 'bulk-optimize-products'
      });
    }
    
    if (categories.total > 0 && (categories.optimized / categories.total) < 0.9) {
      recommendations.push({
        type: 'categories',
        priority: 'medium',
        message: 'Improve category descriptions and meta tags',
        action: 'optimize-categories'
      });
    }
    
    if (images.total > 0 && (images.optimized / images.total) < 0.7) {
      recommendations.push({
        type: 'images',
        priority: 'high',
        message: 'Add alt text and optimize image filenames',
        action: 'bulk-optimize-images'
      });
    }

    return recommendations;
  };

  const handleBulkOptimize = async (type) => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (type) {
        case 'products':
          endpoint = '/api/seo/products/bulk-optimize';
          break;
        case 'categories':
          endpoint = '/api/seo/categories/bulk-optimize';
          break;
        case 'images':
          endpoint = '/api/image-seo/bulk-optimize';
          break;
        default:
          return;
      }
      
      await axios.post(endpoint);
      await fetchSEOData();
    } catch (error) {
      console.error('Error in bulk optimization:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportSEOReport = () => {
    const report = {
      overview: seoData.overview,
      timestamp: new Date().toISOString(),
      products: seoData.products.map(p => ({
        name: p.name,
        slug: p.slug,
        seoScore: p.seoScore,
        issues: p.issues
      })),
      categories: seoData.categories.map(c => ({
        name: c.name,
        slug: c.slug,
        seoScore: c.seoScore,
        issues: c.issues
      })),
      issues: seoData.issues,
      recommendations: seoData.recommendations
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const getScoreStatus = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'normal';
    return 'exception';
  };

  const filteredProducts = seoData.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || 
      (filters.status === 'optimized' && product.seoScore >= 80) ||
      (filters.status === 'needs-work' && product.seoScore < 80);
    return matchesSearch && matchesStatus;
  });

  const filteredCategories = seoData.categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || 
      (filters.status === 'optimized' && category.seoScore >= 80) ||
      (filters.status === 'needs-work' && category.seoScore < 80);
    return matchesSearch && matchesStatus;
  });

  const productColumns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>/{record.slug}</div>
        </div>
      )
    },
    {
      title: 'SEO Score',
      dataIndex: 'seoScore',
      key: 'seoScore',
      render: (score) => (
        <Progress
          percent={score}
          size="small"
          status={getScoreStatus(score)}
          strokeColor={getScoreColor(score)}
        />
      ),
      sorter: (a, b) => a.seoScore - b.seoScore
    },
    {
      title: 'Issues',
      dataIndex: 'issues',
      key: 'issues',
      render: (issues) => (
        <div>
          {issues.map((issue, index) => (
            <Tag key={index} color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'orange' : 'blue'}>
              {issue.message}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => new Date(date).toLocaleDateString()
    }
  ];

  const categoryColumns = [
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>/{record.slug}</div>
        </div>
      )
    },
    {
      title: 'SEO Score',
      dataIndex: 'seoScore',
      key: 'seoScore',
      render: (score) => (
        <Progress
          percent={score}
          size="small"
          status={getScoreStatus(score)}
          strokeColor={getScoreColor(score)}
        />
      ),
      sorter: (a, b) => a.seoScore - b.seoScore
    },
    {
      title: 'Products',
      dataIndex: 'productCount',
      key: 'productCount',
      render: (count) => <Tag color="blue">{count} products</Tag>
    },
    {
      title: 'Issues',
      dataIndex: 'issues',
      key: 'issues',
      render: (issues) => (
        <div>
          {issues.map((issue, index) => (
            <Tag key={index} color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'orange' : 'blue'}>
              {issue.message}
            </Tag>
          ))}
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>SEO Dashboard</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSEOData} loading={loading}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />} onClick={exportSEOReport}>
            Export Report
          </Button>
        </Space>
      </div>

      {/* Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Overall SEO Score"
              value={seoData.overview.overallScore}
              suffix="%"
              valueStyle={{ color: getScoreColor(seoData.overview.overallScore) }}
            />
            <Progress
              percent={seoData.overview.overallScore}
              showInfo={false}
              strokeColor={getScoreColor(seoData.overview.overallScore)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Products Optimized"
              value={seoData.overview.optimizedProducts}
              suffix={`/ ${seoData.overview.totalProducts}`}
              prefix={<CheckCircleOutlined />}
            />
            <div>
              {seoData.overview.totalProducts > 0 && (
                <Progress
                  percent={(seoData.overview.optimizedProducts / seoData.overview.totalProducts) * 100}
                  showInfo={false}
                  strokeColor="#52c41a"
                />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Categories Optimized"
              value={seoData.overview.optimizedCategories}
              suffix={`/ ${seoData.overview.totalCategories}`}
              prefix={<CheckCircleOutlined />}
            />
            <div>
              {seoData.overview.totalCategories > 0 && (
                <Progress
                  percent={(seoData.overview.optimizedCategories / seoData.overview.totalCategories) * 100}
                  showInfo={false}
                  strokeColor="#1890ff"
                />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Images Optimized"
              value={seoData.overview.optimizedImages}
              suffix={`/ ${seoData.overview.totalImages}`}
              prefix={<CheckCircleOutlined />}
            />
            <div>
              {seoData.overview.totalImages > 0 && (
                <Progress
                  percent={(seoData.overview.optimizedImages / seoData.overview.totalImages) * 100}
                  showInfo={false}
                  strokeColor="#722ed1"
                />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recommendations */}
      {seoData.recommendations.length > 0 && (
        <Alert
          message="SEO Recommendations"
          description={
            <List
              size="small"
              dataSource={seoData.recommendations}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="optimize"
                      type="link"
                      size="small"
                      onClick={() => handleBulkOptimize(item.type)}
                    >
                      Optimize
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      item.priority === 'high' ? (
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                      ) : (
                        <WarningOutlined style={{ color: '#faad14' }} />
                      )
                    }
                    title={item.message}
                    description={`Priority: ${item.priority}`}
                  />
                </List.Item>
              )}
            />
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultActiveKey="products" type="card">
        <TabPane tab="Products SEO" key="products">
          <div style={{ marginBottom: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  style={{ width: '100%' }}
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <Option value="all">All Products</Option>
                  <Option value="optimized">Optimized (80%+)</Option>
                  <Option value="needs-work">Needs Work (&lt;80%)</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Button
                  type="primary"
                  block
                  onClick={() => handleBulkOptimize('products')}
                  loading={loading}
                >
                  Bulk Optimize Products
                </Button>
              </Col>
            </Row>
          </div>
          <Table
            dataSource={filteredProducts}
            columns={productColumns}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>

        <TabPane tab="Categories SEO" key="categories">
          <div style={{ marginBottom: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="Search categories..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  style={{ width: '100%' }}
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <Option value="all">All Categories</Option>
                  <Option value="optimized">Optimized (80%+)</Option>
                  <Option value="needs-work">Needs Work (&lt;80%)</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Button
                  type="primary"
                  block
                  onClick={() => handleBulkOptimize('categories')}
                  loading={loading}
                >
                  Bulk Optimize Categories
                </Button>
              </Col>
            </Row>
          </div>
          <Table
            dataSource={filteredCategories}
            columns={categoryColumns}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>

        <TabPane tab="Images SEO" key="images">
          <ImageSEODashboard />
        </TabPane>

        <TabPane tab="Issues & Fixes" key="issues">
          <Card title="SEO Issues Found" style={{ marginBottom: '16px' }}>
            <List
              dataSource={seoData.issues}
              renderItem={(issue) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      issue.severity === 'high' ? (
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                      ) : issue.severity === 'medium' ? (
                        <WarningOutlined style={{ color: '#faad14' }} />
                      ) : (
                        <BugOutlined style={{ color: '#1890ff' }} />
                      )
                    }
                    title={issue.title}
                    description={
                      <div>
                        <div>{issue.description}</div>
                        <div style={{ marginTop: '8px' }}>
                          <Tag color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'orange' : 'blue'}>
                            {issue.severity}
                          </Tag>
                          <Tag color="default">{issue.type}</Tag>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SEODashboard;