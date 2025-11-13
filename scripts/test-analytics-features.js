#!/usr/bin/env node

/**
 * Comprehensive Analytics Features Test Suite
 * Tests all 4 advanced analytics features with real API calls
 * 
 * Features Tested:
 * 1. Custom Dashboards System
 * 2. Real-time Alerts Engine  
 * 3. Predictive Analytics Engine
 * 4. Cross-campaign Analysis Engine
 */

const axios = require('axios');
const colors = require('colors');
const fs = require('fs');

// Configuration
const BASE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3003';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const TEST_USER_ID = process.env.TEST_USER_ID || '123e4567-e89b-12d3-a456-426614174000';

// Test data
let testResults = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    features: {
        customDashboards: { tests: 0, passed: 0 },
        realtimeAlerts: { tests: 0, passed: 0 },
        predictiveAnalytics: { tests: 0, passed: 0 },
        crossCampaignAnalysis: { tests: 0, passed: 0 }
    }
};

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;
    
    switch (type) {
        case 'success':
            console.log(`${prefix} ✅ ${message}`.green);
            break;
        case 'error':
            console.log(`${prefix} ❌ ${message}`.red);
            break;
        case 'warning':
            console.log(`${prefix} ⚠️  ${message}`.yellow);
            break;
        case 'info':
        default:
            console.log(`${prefix} ℹ️  ${message}`.blue);
    }
}

function updateTestResults(feature, passed) {
    testResults.totalTests++;
    testResults.features[feature].tests++;
    
    if (passed) {
        testResults.passedTests++;
        testResults.features[feature].passed++;
    } else {
        testResults.failedTests++;
    }
}

async function makeRequest(method, endpoint, data = null, useGateway = true) {
    const url = useGateway ? `${API_GATEWAY_URL}${endpoint}` : `${BASE_URL}${endpoint}`;
    
    try {
        const config = {
            method,
            url,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}`
            },
            timeout: 10000
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

// Test Functions

async function testCustomDashboards() {
    log('🎨 Testing Custom Dashboards System...', 'info');
    
    // Test 1: Create Dashboard
    log('Testing dashboard creation...', 'info');
    const dashboardData = {
        name: 'Test Dashboard',
        description: 'Analytics test dashboard',
        layout_config: {
            grid: { columns: 12, rows: 6 },
            theme: 'light'
        }
    };
    
    const createResult = await makeRequest('POST', '/api/analytics/dashboards', dashboardData);
    if (createResult.success) {
        log('Dashboard created successfully', 'success');
        updateTestResults('customDashboards', true);
    } else {
        log(`Dashboard creation failed: ${createResult.error}`, 'error');
        updateTestResults('customDashboards', false);
        return;
    }
    
    const dashboardId = createResult.data?.data?.id;
    
    if (dashboardId) {
        // Test 2: Add Widget to Dashboard
        log('Testing widget addition...', 'info');
        const widgetData = {
            widget_type: 'metric_card',
            title: 'Total Scans',
            configuration: {
                metric: 'total_scans',
                timeframe: '7d'
            },
            position: { x: 0, y: 0, width: 3, height: 2 }
        };
        
        const widgetResult = await makeRequest('POST', `/api/analytics/dashboards/${dashboardId}/widgets`, widgetData);
        if (widgetResult.success) {
            log('Widget added successfully', 'success');
            updateTestResults('customDashboards', true);
        } else {
            log(`Widget addition failed: ${widgetResult.error}`, 'error');
            updateTestResults('customDashboards', false);
        }
        
        // Test 3: Get Dashboard Data
        log('Testing dashboard data retrieval...', 'info');
        const dashboardResult = await makeRequest('GET', `/api/analytics/dashboards/${dashboardId}/data`);
        if (dashboardResult.success) {
            log('Dashboard data retrieved successfully', 'success');
            updateTestResults('customDashboards', true);
        } else {
            log(`Dashboard data retrieval failed: ${dashboardResult.error}`, 'error');
            updateTestResults('customDashboards', false);
        }
    }
    
    // Test 4: List User Dashboards
    log('Testing dashboard listing...', 'info');
    const listResult = await makeRequest('GET', '/api/analytics/dashboards');
    if (listResult.success) {
        log(`Found ${listResult.data?.data?.length || 0} dashboards`, 'success');
        updateTestResults('customDashboards', true);
    } else {
        log(`Dashboard listing failed: ${listResult.error}`, 'error');
        updateTestResults('customDashboards', false);
    }
}

async function testRealtimeAlerts() {
    log('🚨 Testing Real-time Alerts Engine...', 'info');
    
    // Test 1: Create Alert Rule
    log('Testing alert rule creation...', 'info');
    const alertData = {
        name: 'High Scan Volume Alert',
        description: 'Alert when scan volume exceeds threshold',
        rule_type: 'threshold',
        conditions: {
            metric: 'scans_per_hour',
            operator: '>',
            threshold: 100
        },
        actions: [
            {
                type: 'email',
                target: 'admin@test.com',
                template: 'high_volume_alert'
            }
        ],
        is_active: true
    };
    
    const alertResult = await makeRequest('POST', '/api/analytics/alerts/rules', alertData);
    if (alertResult.success) {
        log('Alert rule created successfully', 'success');
        updateTestResults('realtimeAlerts', true);
    } else {
        log(`Alert rule creation failed: ${alertResult.error}`, 'error');
        updateTestResults('realtimeAlerts', false);
        return;
    }
    
    const alertRuleId = alertResult.data?.data?.id;
    
    if (alertRuleId) {
        // Test 2: Test Alert Evaluation
        log('Testing alert evaluation...', 'info');
        const evaluationResult = await makeRequest('POST', `/api/analytics/alerts/rules/${alertRuleId}/evaluate`);
        if (evaluationResult.success) {
            log('Alert evaluation completed successfully', 'success');
            updateTestResults('realtimeAlerts', true);
        } else {
            log(`Alert evaluation failed: ${evaluationResult.error}`, 'error');
            updateTestResults('realtimeAlerts', false);
        }
    }
    
    // Test 3: List Alert Rules
    log('Testing alert rules listing...', 'info');
    const listAlertsResult = await makeRequest('GET', '/api/analytics/alerts/rules');
    if (listAlertsResult.success) {
        log(`Found ${listAlertsResult.data?.data?.length || 0} alert rules`, 'success');
        updateTestResults('realtimeAlerts', true);
    } else {
        log(`Alert rules listing failed: ${listAlertsResult.error}`, 'error');
        updateTestResults('realtimeAlerts', false);
    }
    
    // Test 4: Get Alert History
    log('Testing alert history retrieval...', 'info');
    const historyResult = await makeRequest('GET', '/api/analytics/alerts/history');
    if (historyResult.success) {
        log('Alert history retrieved successfully', 'success');
        updateTestResults('realtimeAlerts', true);
    } else {
        log(`Alert history retrieval failed: ${historyResult.error}`, 'error');
        updateTestResults('realtimeAlerts', false);
    }
}

async function testPredictiveAnalytics() {
    log('🔮 Testing Predictive Analytics Engine...', 'info');
    
    // Test 1: Generate Scan Forecast
    log('Testing scan forecast generation...', 'info');
    const forecastData = {
        qr_code_ids: ['123e4567-e89b-12d3-a456-426614174000'],
        prediction_horizon: 7,
        model_type: 'arima',
        confidence_level: 0.95
    };
    
    const forecastResult = await makeRequest('POST', '/api/analytics/predictions/forecasts', forecastData);
    if (forecastResult.success) {
        log('Scan forecast generated successfully', 'success');
        updateTestResults('predictiveAnalytics', true);
    } else {
        log(`Scan forecast generation failed: ${forecastResult.error}`, 'error');
        updateTestResults('predictiveAnalytics', false);
    }
    
    // Test 2: Detect Patterns
    log('Testing pattern detection...', 'info');
    const patternData = {
        qr_code_ids: ['123e4567-e89b-12d3-a456-426614174000'],
        analysis_type: 'seasonal',
        time_granularity: 'daily'
    };
    
    const patternResult = await makeRequest('POST', '/api/analytics/predictions/patterns', patternData);
    if (patternResult.success) {
        log('Patterns detected successfully', 'success');
        updateTestResults('predictiveAnalytics', true);
    } else {
        log(`Pattern detection failed: ${patternResult.error}`, 'error');
        updateTestResults('predictiveAnalytics', false);
    }
    
    // Test 3: Get Optimization Recommendations
    log('Testing optimization recommendations...', 'info');
    const optimizationResult = await makeRequest('GET', '/api/analytics/predictions/recommendations');
    if (optimizationResult.success) {
        log('Optimization recommendations retrieved successfully', 'success');
        updateTestResults('predictiveAnalytics', true);
    } else {
        log(`Optimization recommendations failed: ${optimizationResult.error}`, 'error');
        updateTestResults('predictiveAnalytics', false);
    }
    
    // Test 4: List Prediction Models
    log('Testing prediction models listing...', 'info');
    const modelsResult = await makeRequest('GET', '/api/analytics/predictions/models');
    if (modelsResult.success) {
        log(`Found ${modelsResult.data?.data?.length || 0} prediction models`, 'success');
        updateTestResults('predictiveAnalytics', true);
    } else {
        log(`Prediction models listing failed: ${modelsResult.error}`, 'error');
        updateTestResults('predictiveAnalytics', false);
    }
}

async function testCrossCampaignAnalysis() {
    log('📊 Testing Cross-Campaign Analysis Engine...', 'info');
    
    // Test 1: Create Campaign Group
    log('Testing campaign group creation...', 'info');
    const campaignGroupData = {
        name: 'Test Campaign Group',
        description: 'Test campaign for analytics validation'
    };
    
    const groupResult = await makeRequest('POST', '/api/analytics/cross-campaign/groups', campaignGroupData);
    if (groupResult.success) {
        log('Campaign group created successfully', 'success');
        updateTestResults('crossCampaignAnalysis', true);
    } else {
        log(`Campaign group creation failed: ${groupResult.error}`, 'error');
        updateTestResults('crossCampaignAnalysis', false);
        return;
    }
    
    const groupId = groupResult.data?.data?.id;
    
    if (groupId) {
        // Test 2: Create A/B Experiment
        log('Testing A/B experiment creation...', 'info');
        const experimentData = {
            name: 'Test A/B Experiment',
            hypothesis: 'New design will increase conversions',
            campaign_group_id: groupId,
            control_variant_id: '123e4567-e89b-12d3-a456-426614174001',
            test_variant_id: '123e4567-e89b-12d3-a456-426614174002',
            metric_type: 'conversion_rate',
            target_sample_size: 1000,
            confidence_level: 0.95
        };
        
        const experimentResult = await makeRequest('POST', '/api/analytics/cross-campaign/experiments', experimentData);
        if (experimentResult.success) {
            log('A/B experiment created successfully', 'success');
            updateTestResults('crossCampaignAnalysis', true);
        } else {
            log(`A/B experiment creation failed: ${experimentResult.error}`, 'error');
            updateTestResults('crossCampaignAnalysis', false);
        }
    }
    
    // Test 3: Generate Cohort Analysis
    log('Testing cohort analysis...', 'info');
    const cohortData = {
        campaign_group_ids: [groupId],
        cohort_period: 'weekly',
        retention_periods: [1, 2, 3, 4],
        baseline_metric: 'first_scan'
    };
    
    const cohortResult = await makeRequest('POST', '/api/analytics/cross-campaign/cohort', cohortData);
    if (cohortResult.success) {
        log('Cohort analysis generated successfully', 'success');
        updateTestResults('crossCampaignAnalysis', true);
    } else {
        log(`Cohort analysis failed: ${cohortResult.error}`, 'error');
        updateTestResults('crossCampaignAnalysis', false);
    }
    
    // Test 4: Run Statistical Test
    log('Testing statistical significance testing...', 'info');
    const statTestData = {
        test_type: 't_test',
        campaign_data: [
            {
                campaign_group_id: groupId,
                sample_size: 500,
                success_events: 50,
                metric_values: [0.1, 0.12, 0.09, 0.11]
            }
        ],
        metric: 'conversion_rate',
        confidence_level: 0.95
    };
    
    const statTestResult = await makeRequest('POST', '/api/analytics/cross-campaign/statistical-tests', statTestData);
    if (statTestResult.success) {
        log('Statistical test completed successfully', 'success');
        updateTestResults('crossCampaignAnalysis', true);
    } else {
        log(`Statistical test failed: ${statTestResult.error}`, 'error');
        updateTestResults('crossCampaignAnalysis', false);
    }
}

async function testHealthAndConnectivity() {
    log('🔍 Testing Service Health and Connectivity...', 'info');
    
    // Test Analytics Service Health
    const healthResult = await makeRequest('GET', '/health', null, false);
    if (healthResult.success) {
        log('Analytics service health check passed', 'success');
    } else {
        log('Analytics service health check failed', 'error');
    }
    
    // Test API Gateway Connectivity
    const gatewayHealthResult = await makeRequest('GET', '/health', null, true);
    if (gatewayHealthResult.success) {
        log('API Gateway connectivity check passed', 'success');
    } else {
        log('API Gateway connectivity check failed', 'error');
    }
}

function generateTestReport() {
    log('\n📋 ANALYTICS FEATURES TEST REPORT', 'info');
    log('=' * 50, 'info');
    
    log(`Total Tests: ${testResults.totalTests}`, 'info');
    log(`Passed: ${testResults.passedTests}`, 'success');
    log(`Failed: ${testResults.failedTests}`, testResults.failedTests > 0 ? 'error' : 'success');
    log(`Success Rate: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`, 'info');
    
    log('\n🎯 Feature Breakdown:', 'info');
    Object.entries(testResults.features).forEach(([feature, results]) => {
        const successRate = results.tests > 0 ? ((results.passed / results.tests) * 100).toFixed(1) : 0;
        const status = results.passed === results.tests ? '✅' : '❌';
        log(`${status} ${feature}: ${results.passed}/${results.tests} (${successRate}%)`, 'info');
    });
    
    // Save detailed report to file
    const reportData = {
        timestamp: new Date().toISOString(),
        results: testResults,
        environment: {
            analyticsServiceUrl: BASE_URL,
            apiGatewayUrl: API_GATEWAY_URL,
            nodeEnv: process.env.NODE_ENV || 'development'
        }
    };
    
    try {
        fs.writeFileSync('./analytics-test-report.json', JSON.stringify(reportData, null, 2));
        log('\n📄 Detailed report saved to: analytics-test-report.json', 'success');
    } catch (error) {
        log(`Failed to save report: ${error.message}`, 'error');
    }
}

// Main test execution
async function runAllTests() {
    log('🚀 Starting Comprehensive Analytics Features Test Suite', 'info');
    log('Testing the most advanced QR analytics system with enterprise-grade features\n', 'info');
    
    try {
        await testHealthAndConnectivity();
        await testCustomDashboards();
        await testRealtimeAlerts();
        await testPredictiveAnalytics();
        await testCrossCampaignAnalysis();
        
        generateTestReport();
        
        if (testResults.failedTests === 0) {
            log('\n🎉 ALL TESTS PASSED! Analytics features are production-ready!', 'success');
            process.exit(0);
        } else {
            log(`\n⚠️  ${testResults.failedTests} tests failed. Review the results above.`, 'warning');
            process.exit(1);
        }
        
    } catch (error) {
        log(`Test suite execution failed: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests, testResults };