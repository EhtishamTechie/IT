import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import Footer from '../components/Footer';

const PrivacyPolicyPage = () => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy - International Tijarat</title>
        <meta name="description" content="Privacy Policy for International Tijarat e-commerce platform. Learn how we collect, use, and protect your personal information." />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
          <div className="container mx-auto px-6 lg:px-12 max-w-4xl">
            <h1 className="text-4xl lg:text-5xl font-bold text-center mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-center text-orange-100">
              Your privacy is important to us. Learn how we protect your information.
            </p>
            <p className="text-center text-orange-200 mt-4">
              Last updated: October 11, 2025
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto px-6 lg:px-12 max-w-4xl py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 lg:p-12">
            
            {/* Introduction */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-l-4 border-orange-500 pl-4">Introduction</h2>
              <div className="prose prose-lg text-gray-700 leading-relaxed">
                <p className="mb-4">
                  Welcome to International Tijarat. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our e-commerce platform.
                </p>
                <p className="mb-4">
                  By using our platform, you consent to the data practices described in this policy. If you do not agree with the practices described in this policy, please do not use our services.
                </p>
              </div>
            </section>

            {/* Information We Collect */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-l-4 border-orange-500 pl-4">Information We Collect</h2>
              
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">We may collect personal information that you provide directly to us, including:</p>
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    <li>Name, email address, and contact information</li>
                    <li>Billing and shipping addresses</li>
                    <li>Payment information (processed securely through third-party providers)</li>
                    <li>Account credentials and profile information</li>
                    <li>Communication preferences and customer service interactions</li>
                    <li>Business information for vendor accounts</li>
                  </ul>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Automatically Collected Information</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">When you use our platform, we automatically collect certain information:</p>
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    <li>Device information (IP address, browser type, operating system)</li>
                    <li>Usage data (pages visited, time spent, click patterns)</li>
                    <li>Location information (if enabled)</li>
                    <li>Cookies and tracking technologies data</li>
                    <li>Search queries and preferences</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Information */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-l-4 border-orange-500 pl-4">How We Use Your Information</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">We use the information we collect for various purposes, including:</p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Processing orders and managing transactions</li>
                  <li>Providing customer support and responding to inquiries</li>
                  <li>Personalizing your shopping experience</li>
                  <li>Sending promotional emails and marketing communications (with your consent)</li>
                  <li>Improving our website and services</li>
                  <li>Detecting and preventing fraud or unauthorized activities</li>
                  <li>Complying with legal obligations</li>
                  <li>Managing vendor relationships and marketplace operations</li>
                </ul>
              </div>
            </section>

            {/* Information Sharing */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Information Sharing and Disclosure</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">We do not sell, trade, or rent your personal information to third parties. However, we may share your information in the following circumstances:</p>
                
                <div className="mb-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-3">Service Providers</h4>
                  <p className="mb-4">We may share information with trusted third-party service providers who assist us in operating our platform, including:</p>
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    <li>Payment processors and financial institutions</li>
                    <li>Shipping and logistics partners</li>
                    <li>Email service providers</li>
                    <li>Analytics and marketing platforms</li>
                    <li>Cloud hosting and security services</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-3">Legal Requirements</h4>
                  <p className="mb-4">We may disclose your information when required by law or to:</p>
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    <li>Comply with legal processes or government requests</li>
                    <li>Protect our rights, property, or safety</li>
                    <li>Investigate potential violations of our terms</li>
                    <li>Prevent fraud or illegal activities</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-3">Business Transfers</h4>
                  <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction.</p>
                </div>
              </div>
            </section>

            {/* Data Security */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Data Security</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>SSL encryption for data transmission</li>
                  <li>Secure payment processing with PCI compliance</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Access controls and authentication systems</li>
                  <li>Employee training on data protection</li>
                </ul>
                <p className="mb-4">
                  However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.
                </p>
              </div>
            </section>

            {/* Cookies and Tracking */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Cookies and Tracking Technologies</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  We use cookies and similar tracking technologies to enhance your browsing experience and collect information about how you use our platform. These technologies help us:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Remember your preferences and settings</li>
                  <li>Provide personalized content and recommendations</li>
                  <li>Analyze website traffic and user behavior</li>
                  <li>Improve our services and user experience</li>
                  <li>Deliver targeted advertising (with your consent)</li>
                </ul>
                <p className="mb-4">
                  You can control cookie settings through your browser preferences. However, disabling cookies may limit some functionality of our platform.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Your Rights and Choices</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">You have certain rights regarding your personal information:</p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service provider</li>
                  <li><strong>Objection:</strong> Object to certain types of processing</li>
                  <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                </ul>
                <p className="mb-4">
                  To exercise these rights, please contact us at privacy@internationaltijarat.com. We will respond to your request within 30 days.
                </p>
              </div>
            </section>

            {/* Data Retention */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Data Retention</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law. Factors that influence our retention periods include:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Legal and regulatory requirements</li>
                  <li>Business and operational needs</li>
                  <li>Security and fraud prevention</li>
                  <li>User account activity and preferences</li>
                </ul>
              </div>
            </section>

            {/* Third-Party Links */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Third-Party Links and Services</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  Our platform may contain links to third-party websites or services. This Privacy Policy does not apply to these external sites. We encourage you to review the privacy policies of any third-party services you visit.
                </p>
              </div>
            </section>

            {/* Children's Privacy */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Children's Privacy</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information promptly.
                </p>
              </div>
            </section>

            {/* International Transfers */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">International Data Transfers</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  Your information may be transferred to and processed in countries other than your country of residence. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
                </p>
              </div>
            </section>

            {/* Policy Updates */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Changes to This Privacy Policy</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of significant changes by posting the updated policy on our website and updating the "Last updated" date at the top of this page.
                </p>
                <p className="mb-4">
                  We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                  <p className="mb-2"><strong>Email:</strong> privacy@internationaltijarat.com</p>
                  <p className="mb-2"><strong>Support:</strong> support@internationaltijarat.com</p>
                  <p className="mb-2"><strong>Address:</strong> International Tijarat Privacy Office</p>
                  <p className="mb-2">Business Operations Center</p>
                  <p>Pakistan</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default PrivacyPolicyPage;