import React, { useState, useEffect } from 'react';
import { Card, Button, List, Tag, Alert, Space, Divider, Typography, Row, Col, Statistic } from 'antd';
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const SEOValidationPage = () => {
  const [validationResults, setValidationResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runValidation = async () => {
    setLoading(true);
    try {
      // Run basic validation checks
      const checks = await performSEOChecks();
      setValidationResults(checks);
    } catch (error) {
      console.error('Error running SEO validation:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSEOChecks = async () => {
    const results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: []
    };

    const addCheck = (name, status, message, details = null) => {
      results.checks.push({ name, status, message, details });
      results[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'warnings']++;
    };

    // Check 1: API Endpoints
    try {
      const healthResponse = await axios.get('/api/seo/health');
      if (healthResponse.status === 200) {
        addCheck('SEO Health API', 'pass', 'SEO health endpoint is working');
      } else {
        addCheck('SEO Health API', 'fail', 'SEO health endpoint returned error');
      }
    } catch (error) {
      addCheck('SEO Health API', 'fail', 'SEO health endpoint is not accessible', { error: error.message });
    }

    // Check 2: Sitemap
    try {
      const sitemapResponse = await axios.get('/api/seo/sitemap.xml');
      if (sitemapResponse.status === 200 && sitemapResponse.data.includes('<urlset')) {
        addCheck('XML Sitemap', 'pass', 'XML sitemap is properly generated');
      } else {
        addCheck('XML Sitemap', 'fail', 'XML sitemap has issues');
      }
    } catch (error) {
      addCheck('XML Sitemap', 'fail', 'XML sitemap is not accessible', { error: error.message });
    }

    // Check 3: Robots.txt
    try {
      const robotsResponse = await axios.get('/api/seo/robots.txt');
      if (robotsResponse.status === 200 && robotsResponse.data.includes('User-agent:')) {
        addCheck('Robots.txt', 'pass', 'Robots.txt is properly configured');
      } else {
        addCheck('Robots.txt', 'fail', 'Robots.txt has issues');
      }
    } catch (error) {
      addCheck('Robots.txt', 'fail', 'Robots.txt is not accessible', { error: error.message });
    }

    // Check 4: Meta Tags
    const headElement = document.head;
    const title = headElement.querySelector('title');
    const metaDescription = headElement.querySelector('meta[name="description"]');
    
    if (title && title.textContent.trim()) {
      addCheck('Page Title', 'pass', `Title tag found: "${title.textContent}"`);
    } else {
      addCheck('Page Title', 'fail', 'Page title is missing or empty');
    }

    if (metaDescription && metaDescription.getAttribute('content')) {
      addCheck('Meta Description', 'pass', 'Meta description is present');
    } else {
      addCheck('Meta Description', 'warning', 'Meta description is missing');
    }

    // Check 5: Image Alt Text
    const images = document.querySelectorAll('img');
    let imagesWithAlt = 0;
    images.forEach(img => {
      if (img.getAttribute('alt')) {
        imagesWithAlt++;
      }
    });

    if (images.length === 0) {
      addCheck('Image Alt Text', 'warning', 'No images found on this page');
    } else if (imagesWithAlt === images.length) {
      addCheck('Image Alt Text', 'pass', `All ${images.length} images have alt text`);
    } else {
      addCheck('Image Alt Text', 'warning', `${imagesWithAlt}/${images.length} images have alt text`);
    }

    // Check 6: Structured Data
    const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
    if (structuredDataScripts.length > 0) {
      addCheck('Structured Data', 'pass', `${structuredDataScripts.length} structured data blocks found`);
    } else {
      addCheck('Structured Data', 'warning', 'No structured data found on this page');
    }

    // Check 7: URL Structure
    const currentUrl = window.location.pathname;
    if (currentUrl.includes('/product/') || currentUrl.includes('/category/')) {
      if (!currentUrl.includes('id=') && !currentUrl.match(/\/\d+$/)) {
        addCheck('URL Structure', 'pass', 'URL uses SEO-friendly slugs');
      } else {
        addCheck('URL Structure', 'warning', 'URL contains IDs instead of slugs');
      }
    } else {
      addCheck('URL Structure', 'pass', 'Static page URL structure is fine');
    }

    return results;
  };

  useEffect(() => {
    runValidation();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'fail':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass':
        return 'success';
      case 'warning':
        return 'warning';
      case 'fail':
        return 'error';
      default:
        return 'default';
    }
  };

  const manualChecklist = [
    {
      category: 'Frontend SEO Features',
      items: [
        'Product pages have proper titles and meta descriptions',
        'Category pages have proper SEO structure',
        'Breadcrumbs appear correctly',
        'Images have alt text',
        'Clean URLs with slugs',
        'Open Graph tags for social sharing',
        'Structured data appears'
      ]
    },
    {
      category: 'Backend SEO Features',
      items: [
        'SEO forms work in admin panel',
        'Auto-generation features work',
        'Bulk optimization works',
        'Image SEO features work',
        'Sitemap generates correctly',
        'Robots.txt works'
      ]
    },
    {
      category: 'Dashboard Features',
      items: [
        'SEO Dashboard loads',
        'Statistics display correctly',
        'Product/Category analysis works',
        'Bulk operations work',
        'Export functionality works'
      ]
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <Title level={2}>SEO Validation & Testing</Title>
        <Text type="secondary">
          Comprehensive validation of SEO implementation for International Tijarat
        </Text>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Automated Validation Results */}
        <Card 
          title="Automated SEO Validation" 
          extra={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={runValidation} 
              loading={loading}
            >
              Re-run Validation
            </Button>
          }
        >
          {validationResults && (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Passed"
                    value={validationResults.passed}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Warnings"
                    value={validationResults.warnings}
                    valueStyle={{ color: '#faad14' }}
                    prefix={<WarningOutlined />}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Failed"
                    value={validationResults.failed}
                    valueStyle={{ color: '#ff4d4f' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
              </Row>

              <List
                dataSource={validationResults.checks}
                renderItem={(check) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={getStatusIcon(check.status)}
                      title={
                        <Space>
                          <span>{check.name}</span>
                          <Tag color={getStatusColor(check.status)}>
                            {check.status.toUpperCase()}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div>{check.message}</div>
                          {check.details && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                              <Text code>{JSON.stringify(check.details, null, 2)}</Text>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </>
          )}
        </Card>

        {/* Manual Testing Checklist */}
        <Card title="Manual Testing Checklist">
          <Alert
            message="Manual Testing Required"
            description="The following items require manual testing to ensure complete SEO functionality"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          {manualChecklist.map((section, index) => (
            <div key={index}>
              <Title level={4}>{section.category}</Title>
              <List
                dataSource={section.items}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<span style={{ color: '#1890ff' }}>◯</span>}
                      title={item}
                      description="Click to mark as tested"
                    />
                  </List.Item>
                )}
              />
              {index < manualChecklist.length - 1 && <Divider />}
            </div>
          ))}
        </Card>

        {/* SEO Tools and Resources */}
        <Card title="SEO Testing Tools & Resources">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card size="small" title="External SEO Tools">
                <List size="small">
                  <List.Item>
                    <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer">
                      Google Rich Results Test
                    </a>
                  </List.Item>
                  <List.Item>
                    <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noopener noreferrer">
                      Facebook Sharing Debugger
                    </a>
                  </List.Item>
                  <List.Item>
                    <a href="https://cards-dev.twitter.com/" target="_blank" rel="noopener noreferrer">
                      Twitter Card Validator
                    </a>
                  </List.Item>
                  <List.Item>
                    <a href="https://www.xml-sitemaps.com/" target="_blank" rel="noopener noreferrer">
                      XML Sitemap Validator
                    </a>
                  </List.Item>
                </List>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title="Internal SEO Endpoints">
                <List size="small">
                  <List.Item>
                    <a href="/api/seo/sitemap.xml" target="_blank" rel="noopener noreferrer">
                      XML Sitemap
                    </a>
                  </List.Item>
                  <List.Item>
                    <a href="/api/seo/robots.txt" target="_blank" rel="noopener noreferrer">
                      Robots.txt
                    </a>
                  </List.Item>
                  <List.Item>
                    <a href="/api/seo/health" target="_blank" rel="noopener noreferrer">
                      SEO Health Check
                    </a>
                  </List.Item>
                  <List.Item>
                    <a href="/admin/seo-dashboard" target="_blank" rel="noopener noreferrer">
                      SEO Dashboard
                    </a>
                  </List.Item>
                </List>
              </Card>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
};

export default SEOValidationPage;