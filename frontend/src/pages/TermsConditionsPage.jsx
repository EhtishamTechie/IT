import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import Footer from '../components/Footer';

const TermsConditionsPage = () => {
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
        <title>Terms and Conditions - International Tijarat</title>
        <meta name="description" content="Terms and Conditions for International Tijarat e-commerce platform. Read our legal terms, user agreements, and service conditions." />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
          <div className="container mx-auto px-6 lg:px-12 max-w-4xl">
            <h1 className="text-4xl lg:text-5xl font-bold text-center mb-4">
              Terms and Conditions
            </h1>
            <p className="text-xl text-center text-orange-100">
              Please read these terms carefully before using our platform.
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
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-l-4 border-orange-500 pl-4">Agreement to Terms</h2>
              <div className="prose prose-lg text-gray-700 leading-relaxed">
                <p className="mb-4">
                  Welcome to International Tijarat. These Terms and Conditions govern your relationship with the International Tijarat website and e-commerce platform operated by International Tijarat.
                </p>
                <p className="mb-4">
                  By accessing and using our Service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
                <p className="mb-4">
                  These Terms apply to all visitors, users, vendors, and others who access or use the Service.
                </p>
              </div>
            </section>

            {/* Definitions */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-l-4 border-orange-500 pl-4">Definitions</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">For the purposes of these Terms and Conditions:</p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li><strong>"Platform"</strong> refers to the International Tijarat website and mobile applications</li>
                  <li><strong>"User"</strong> refers to any individual who accesses or uses the Platform</li>
                  <li><strong>"Vendor"</strong> refers to businesses or individuals selling products through our Platform</li>
                  <li><strong>"Customer"</strong> refers to users who purchase products or services</li>
                  <li><strong>"Content"</strong> refers to all text, images, videos, and other materials on the Platform</li>
                  <li><strong>"Services"</strong> refers to all features and functionalities provided by the Platform</li>
                </ul>
              </div>
            </section>

            {/* Use of the Platform */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Use of the Platform</h2>
              
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Acceptable Use</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">You may use our Platform for lawful purposes only. You agree not to use the Platform:</p>
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    <li>To violate any local, state, national, or international law or regulation</li>
                    <li>To transmit or send unsolicited or unauthorized advertising or promotional material</li>
                    <li>To impersonate any person or entity or falsely state your affiliation</li>
                    <li>To engage in any conduct that restricts or inhibits anyone's use of the Platform</li>
                    <li>To upload, post, or transmit any content that is unlawful, harmful, or offensive</li>
                    <li>To attempt to gain unauthorized access to any portion of the Platform</li>
                  </ul>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Account Registration</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">To access certain features, you may be required to register an account. You agree to:</p>
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and update your account information</li>
                    <li>Keep your password secure and confidential</li>
                    <li>Accept responsibility for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized use</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Products and Services */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Products and Services</h2>
              
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Product Information</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">
                    We strive to ensure that product information on our Platform is accurate. However, we do not warrant that product descriptions, pricing, or other content is error-free, complete, or current.
                  </p>
                  <p className="mb-4">
                    All products are subject to availability. We reserve the right to discontinue any product at any time without notice.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Pricing and Payment</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">All prices are listed in the applicable currency and are subject to change without notice. Prices include applicable taxes unless otherwise stated.</p>
                  <p className="mb-4">Payment is required at the time of purchase. We accept various payment methods as displayed during checkout.</p>
                  <p className="mb-4">We reserve the right to refuse or cancel orders at our discretion, including for pricing errors or product unavailability.</p>
                </div>
              </div>
            </section>

            {/* Vendor Terms */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Vendor Terms</h2>
              
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Vendor Registration</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">Vendors must complete our registration process and meet our requirements to sell on the Platform. We reserve the right to approve or reject vendor applications at our discretion.</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Vendor Responsibilities</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">Vendors are responsible for:</p>
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    <li>Providing accurate product information and descriptions</li>
                    <li>Maintaining adequate inventory levels</li>
                    <li>Fulfilling orders promptly and professionally</li>
                    <li>Providing customer service for their products</li>
                    <li>Complying with all applicable laws and regulations</li>
                    <li>Paying applicable fees and commissions</li>
                  </ul>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Commission and Fees</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">
                    Vendors agree to pay commissions and fees as outlined in their vendor agreement. We may change our fee structure with reasonable notice to vendors.
                  </p>
                </div>
              </div>
            </section>

            {/* Orders and Delivery */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Orders and Delivery</h2>
              
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Order Processing</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">
                    Orders are processed by individual vendors. Processing and delivery times may vary by vendor and product. We are not responsible for delays caused by vendors or shipping carriers.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Shipping and Risk of Loss</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">
                    Shipping terms and costs are determined by individual vendors. Risk of loss and title for products purchased pass to you upon delivery to the carrier.
                  </p>
                </div>
              </div>
            </section>

            {/* Returns and Refunds */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Returns and Refunds</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  Return and refund policies are determined by individual vendors and may vary by product. Please review the specific return policy for each vendor before making a purchase.
                </p>
                <p className="mb-4">
                  We may facilitate return processes but are not responsible for vendor return policies or decisions.
                </p>
              </div>
            </section>

            {/* Intellectual Property */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Intellectual Property Rights</h2>
              
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Platform Content</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">
                    The Platform and its original content, features, and functionality are owned by International Tijarat and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">User Content</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">
                    By posting content on our Platform, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and distribute such content for the purpose of operating and improving our Service.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Copyright Infringement</h3>
                <div className="prose prose-lg text-gray-700">
                  <p className="mb-4">
                    We respect intellectual property rights and expect users to do the same. If you believe your copyright has been infringed, please contact us with details of the alleged infringement.
                  </p>
                </div>
              </div>
            </section>

            {/* Privacy and Data Protection */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Privacy and Data Protection</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Platform, to understand our practices regarding the collection and use of your information.
                </p>
                <p className="mb-4">
                  By using our Platform, you consent to the collection and use of information in accordance with our Privacy Policy.
                </p>
              </div>
            </section>

            {/* Disclaimers */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Disclaimers</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  The information on this Platform is provided on an "as is" basis. We make no representations or warranties of any kind, express or implied, regarding:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>The accuracy, reliability, or completeness of information</li>
                  <li>The quality, safety, or legality of products sold by vendors</li>
                  <li>The continuous availability of the Platform</li>
                  <li>The security of data transmission</li>
                </ul>
                <p className="mb-4">
                  We disclaim all warranties, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.
                </p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Limitation of Liability</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  To the maximum extent permitted by law, International Tijarat shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Loss of profits, data, or business opportunities</li>
                  <li>Personal injury or property damage</li>
                  <li>Costs of procurement of substitute goods or services</li>
                  <li>Any damages arising from vendor actions or products</li>
                </ul>
                <p className="mb-4">
                  Our total liability for any claim related to the Platform shall not exceed the amount you paid to us in the twelve months preceding the claim.
                </p>
              </div>
            </section>

            {/* Indemnification */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Indemnification</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  You agree to defend, indemnify, and hold harmless International Tijarat and its affiliates from and against any claims, damages, losses, costs, and expenses arising from:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Your violation of these Terms</li>
                  <li>Your use of the Platform</li>
                  <li>Your content or activities on the Platform</li>
                  <li>Your violation of any third-party rights</li>
                </ul>
              </div>
            </section>

            {/* Termination */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Termination</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  We may terminate or suspend your account and access to the Platform immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
                </p>
                <p className="mb-4">
                  You may terminate your account at any time by contacting us. Upon termination, your right to use the Platform ceases immediately.
                </p>
                <p className="mb-4">
                  Provisions that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
                </p>
              </div>
            </section>

            {/* Governing Law */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Governing Law and Jurisdiction</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  These Terms shall be governed by and construed in accordance with the laws of Pakistan, without regard to its conflict of law provisions.
                </p>
                <p className="mb-4">
                  Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of Pakistan.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Changes to Terms</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
                <p className="mb-4">
                  By continuing to access or use our Platform after revisions become effective, you agree to be bound by the revised terms.
                </p>
              </div>
            </section>

            {/* Severability */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Severability</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.
                </p>
              </div>
            </section>

            {/* Entire Agreement */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Entire Agreement</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  These Terms, together with our Privacy Policy and any other legal notices published by us on the Platform, constitute the entire agreement between you and International Tijarat concerning the Platform.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Contact Information</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  If you have any questions about these Terms and Conditions, please contact us:
                </p>
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                  <p className="mb-2"><strong>Email:</strong> legal@internationaltijarat.com</p>
                  <p className="mb-2"><strong>Support:</strong> support@internationaltijarat.com</p>
                  <p className="mb-2"><strong>Address:</strong> International Tijarat Legal Department</p>
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

export default TermsConditionsPage;