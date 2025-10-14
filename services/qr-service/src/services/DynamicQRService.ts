import {
  QRContentVersion,
  QRABTest,
  QRRedirectRule,
  QRContentSchedule,
  QRDynamicAnalytics,
  DynamicQRStats,
  IDynamicQRService,
  IDynamicQRRepository,
  ServiceResponse,
  CreateContentVersionRequest,
  CreateABTestRequest,
  CreateRedirectRuleRequest,
  CreateContentScheduleRequest,
  ValidationError,
  BusinessLogicError
} from '../interfaces';
import { DynamicQRRepository } from '../repositories/DynamicQRRepository';
import { UAParser } from 'ua-parser-js';

export class DynamicQRService implements IDynamicQRService {
  constructor(private dynamicQRRepository: IDynamicQRRepository) {}

  // ===============================================
  // CONTENT VERSION MANAGEMENT
  // ===============================================

  async createContentVersion(
    qrCodeId: string, 
    versionData: CreateContentVersionRequest
  ): Promise<ServiceResponse<QRContentVersion>> {
    try {
      this.validateQRCodeId(qrCodeId);
      this.validateContentVersionData(versionData);

      // If setting as active, deactivate other versions first
      if (versionData.isActive) {
        await this.deactivateAllVersions(qrCodeId);
      }

      const version = await this.dynamicQRRepository.createContentVersion({
        qrCodeId,
        ...versionData,
        isActive: versionData.isActive || false
      });

      return {
        success: true,
        data: version,
        message: 'Content version created successfully'
      };
    } catch (error) {
      return this.handleError('Failed to create content version', error);
    }
  }

  async getContentVersions(qrCodeId: string): Promise<ServiceResponse<QRContentVersion[]>> {
    try {
      this.validateQRCodeId(qrCodeId);

      const versions = await this.dynamicQRRepository.findContentVersionsByQRCode(qrCodeId);
      
      return {
        success: true,
        data: versions,
        message: `Found ${versions.length} content versions`
      };
    } catch (error) {
      return this.handleError('Failed to get content versions', error);
    }
  }

  async getActiveContentVersion(qrCodeId: string): Promise<ServiceResponse<QRContentVersion | null>> {
    try {
      this.validateQRCodeId(qrCodeId);

      const version = await this.dynamicQRRepository.getActiveContentVersion(qrCodeId);
      
      return {
        success: true,
        data: version,
        message: version ? 'Active content version found' : 'No active content version'
      };
    } catch (error) {
      return this.handleError('Failed to get active content version', error);
    }
  }

  async updateContentVersion(
    versionId: string, 
    versionData: Partial<CreateContentVersionRequest>
  ): Promise<ServiceResponse<QRContentVersion>> {
    try {
      this.validateVersionId(versionId);

      const existingVersion = await this.dynamicQRRepository.findContentVersionById(versionId);
      if (!existingVersion) {
        throw new ValidationError('Content version not found');
      }

      // If setting as active, deactivate other versions first
      if (versionData.isActive) {
        await this.deactivateAllVersions(existingVersion.qrCodeId);
      }

      const updatedVersion = await this.dynamicQRRepository.updateContentVersion(versionId, versionData);

      return {
        success: true,
        data: updatedVersion,
        message: 'Content version updated successfully'
      };
    } catch (error) {
      return this.handleError('Failed to update content version', error);
    }
  }

  async activateContentVersion(versionId: string): Promise<ServiceResponse<QRContentVersion>> {
    try {
      this.validateVersionId(versionId);

      const version = await this.dynamicQRRepository.findContentVersionById(versionId);
      if (!version) {
        throw new ValidationError('Content version not found');
      }

      // Deactivate all other versions for this QR code
      await this.deactivateAllVersions(version.qrCodeId);

      const activatedVersion = await this.dynamicQRRepository.updateContentVersion(versionId, {
        isActive: true
      });

      return {
        success: true,
        data: activatedVersion,
        message: 'Content version activated successfully'
      };
    } catch (error) {
      return this.handleError('Failed to activate content version', error);
    }
  }

  async deactivateContentVersion(versionId: string): Promise<ServiceResponse<QRContentVersion>> {
    try {
      this.validateVersionId(versionId);

      const deactivatedVersion = await this.dynamicQRRepository.updateContentVersion(versionId, {
        isActive: false
      });

      return {
        success: true,
        data: deactivatedVersion,
        message: 'Content version deactivated successfully'
      };
    } catch (error) {
      return this.handleError('Failed to deactivate content version', error);
    }
  }

  async deleteContentVersion(versionId: string): Promise<ServiceResponse<boolean>> {
    try {
      this.validateVersionId(versionId);

      const version = await this.dynamicQRRepository.findContentVersionById(versionId);
      if (!version) {
        throw new ValidationError('Content version not found');
      }

      // Check if this version is being used in active A/B tests
      const abTests = await this.dynamicQRRepository.findABTestsByQRCode(version.qrCodeId);
      const activeTests = abTests.filter(test => 
        test.status === 'running' && 
        (test.variantAVersionId === versionId || test.variantBVersionId === versionId)
      );

      if (activeTests.length > 0) {
        throw new BusinessLogicError('Cannot delete version that is part of active A/B tests');
      }

      const deleted = await this.dynamicQRRepository.deleteContentVersion(versionId);

      return {
        success: true,
        data: deleted,
        message: 'Content version deleted successfully'
      };
    } catch (error) {
      return this.handleError('Failed to delete content version', error);
    }
  }

  // ===============================================
  // A/B TESTING MANAGEMENT
  // ===============================================

  async createABTest(
    qrCodeId: string, 
    testData: CreateABTestRequest
  ): Promise<ServiceResponse<QRABTest>> {
    try {
      this.validateQRCodeId(qrCodeId);
      this.validateABTestData(testData);

      // Validate that both variants exist
      const [variantA, variantB] = await Promise.all([
        this.dynamicQRRepository.findContentVersionById(testData.variantAVersionId),
        this.dynamicQRRepository.findContentVersionById(testData.variantBVersionId)
      ]);

      if (!variantA || !variantB) {
        throw new ValidationError('Both variant versions must exist');
      }

      if (variantA.qrCodeId !== qrCodeId || variantB.qrCodeId !== qrCodeId) {
        throw new ValidationError('Variants must belong to the specified QR code');
      }

      const abTest = await this.dynamicQRRepository.createABTest({
        qrCodeId,
        ...testData,
        trafficSplit: testData.trafficSplit || 50
      });

      return {
        success: true,
        data: abTest,
        message: 'A/B test created successfully'
      };
    } catch (error) {
      return this.handleError('Failed to create A/B test', error);
    }
  }

  async getABTests(qrCodeId: string): Promise<ServiceResponse<QRABTest[]>> {
    try {
      this.validateQRCodeId(qrCodeId);

      const tests = await this.dynamicQRRepository.findABTestsByQRCode(qrCodeId);

      return {
        success: true,
        data: tests,
        message: `Found ${tests.length} A/B tests`
      };
    } catch (error) {
      return this.handleError('Failed to get A/B tests', error);
    }
  }

  async updateABTest(
    testId: string, 
    testData: Partial<CreateABTestRequest>
  ): Promise<ServiceResponse<QRABTest>> {
    try {
      this.validateTestId(testId);

      const existingTest = await this.dynamicQRRepository.findABTestById(testId);
      if (!existingTest) {
        throw new ValidationError('A/B test not found');
      }

      if (existingTest.status === 'running' && testData.trafficSplit !== undefined) {
        throw new BusinessLogicError('Cannot change traffic split of running test');
      }

      const updatedTest = await this.dynamicQRRepository.updateABTest(testId, testData);

      return {
        success: true,
        data: updatedTest,
        message: 'A/B test updated successfully'
      };
    } catch (error) {
      return this.handleError('Failed to update A/B test', error);
    }
  }

  async startABTest(testId: string): Promise<ServiceResponse<QRABTest>> {
    try {
      this.validateTestId(testId);

      const test = await this.dynamicQRRepository.findABTestById(testId);
      if (!test) {
        throw new ValidationError('A/B test not found');
      }

      if (test.status !== 'draft') {
        throw new BusinessLogicError('Only draft tests can be started');
      }

      const startedTest = await this.dynamicQRRepository.updateABTest(testId, {
        status: 'running'
      });

      return {
        success: true,
        data: startedTest,
        message: 'A/B test started successfully'
      };
    } catch (error) {
      return this.handleError('Failed to start A/B test', error);
    }
  }

  async pauseABTest(testId: string): Promise<ServiceResponse<QRABTest>> {
    try {
      this.validateTestId(testId);

      const pausedTest = await this.dynamicQRRepository.updateABTest(testId, {
        status: 'paused'
      });

      return {
        success: true,
        data: pausedTest,
        message: 'A/B test paused successfully'
      };
    } catch (error) {
      return this.handleError('Failed to pause A/B test', error);
    }
  }

  async completeABTest(
    testId: string, 
    winnerVariant?: 'A' | 'B'
  ): Promise<ServiceResponse<QRABTest>> {
    try {
      this.validateTestId(testId);

      const completedTest = await this.dynamicQRRepository.updateABTest(testId, {
        status: 'completed',
        winnerVariant
      });

      return {
        success: true,
        data: completedTest,
        message: 'A/B test completed successfully'
      };
    } catch (error) {
      return this.handleError('Failed to complete A/B test', error);
    }
  }

  async deleteABTest(testId: string): Promise<ServiceResponse<boolean>> {
    try {
      this.validateTestId(testId);

      const test = await this.dynamicQRRepository.findABTestById(testId);
      if (!test) {
        throw new ValidationError('A/B test not found');
      }

      if (test.status === 'running') {
        throw new BusinessLogicError('Cannot delete running A/B test. Pause it first.');
      }

      const deleted = await this.dynamicQRRepository.deleteABTest(testId);

      return {
        success: true,
        data: deleted,
        message: 'A/B test deleted successfully'
      };
    } catch (error) {
      return this.handleError('Failed to delete A/B test', error);
    }
  }

  // ===============================================
  // REDIRECT RULES MANAGEMENT
  // ===============================================

  async createRedirectRule(
    qrCodeId: string, 
    ruleData: CreateRedirectRuleRequest
  ): Promise<ServiceResponse<QRRedirectRule>> {
    try {
      this.validateQRCodeId(qrCodeId);
      this.validateRedirectRuleData(ruleData);

      // Validate target version exists
      const targetVersion = await this.dynamicQRRepository.findContentVersionById(ruleData.targetVersionId);
      if (!targetVersion) {
        throw new ValidationError('Target version not found');
      }

      if (targetVersion.qrCodeId !== qrCodeId) {
        throw new ValidationError('Target version must belong to the specified QR code');
      }

      const rule = await this.dynamicQRRepository.createRedirectRule({
        qrCodeId,
        ...ruleData,
        priority: ruleData.priority || 1,
        isEnabled: ruleData.isEnabled !== false
      });

      return {
        success: true,
        data: rule,
        message: 'Redirect rule created successfully'
      };
    } catch (error) {
      return this.handleError('Failed to create redirect rule', error);
    }
  }

  async getRedirectRules(qrCodeId: string): Promise<ServiceResponse<QRRedirectRule[]>> {
    try {
      this.validateQRCodeId(qrCodeId);

      const rules = await this.dynamicQRRepository.findRedirectRulesByQRCode(qrCodeId);

      return {
        success: true,
        data: rules,
        message: `Found ${rules.length} redirect rules`
      };
    } catch (error) {
      return this.handleError('Failed to get redirect rules', error);
    }
  }

  async updateRedirectRule(
    ruleId: string, 
    ruleData: Partial<CreateRedirectRuleRequest>
  ): Promise<ServiceResponse<QRRedirectRule>> {
    try {
      this.validateRuleId(ruleId);

      const updatedRule = await this.dynamicQRRepository.updateRedirectRule(ruleId, ruleData);

      return {
        success: true,
        data: updatedRule,
        message: 'Redirect rule updated successfully'
      };
    } catch (error) {
      return this.handleError('Failed to update redirect rule', error);
    }
  }

  async deleteRedirectRule(ruleId: string): Promise<ServiceResponse<boolean>> {
    try {
      this.validateRuleId(ruleId);

      const deleted = await this.dynamicQRRepository.deleteRedirectRule(ruleId);

      return {
        success: true,
        data: deleted,
        message: 'Redirect rule deleted successfully'
      };
    } catch (error) {
      return this.handleError('Failed to delete redirect rule', error);
    }
  }

  // ===============================================
  // CONTENT SCHEDULING MANAGEMENT
  // ===============================================

  async createContentSchedule(
    qrCodeId: string, 
    scheduleData: CreateContentScheduleRequest
  ): Promise<ServiceResponse<QRContentSchedule>> {
    try {
      this.validateQRCodeId(qrCodeId);
      this.validateContentScheduleData(scheduleData);

      // Validate target version exists
      const targetVersion = await this.dynamicQRRepository.findContentVersionById(scheduleData.versionId);
      if (!targetVersion) {
        throw new ValidationError('Target version not found');
      }

      if (targetVersion.qrCodeId !== qrCodeId) {
        throw new ValidationError('Target version must belong to the specified QR code');
      }

      const schedule = await this.dynamicQRRepository.createContentSchedule({
        qrCodeId,
        ...scheduleData,
        repeatPattern: scheduleData.repeatPattern || 'none',
        timezone: scheduleData.timezone || 'UTC',
        isActive: scheduleData.isActive !== false
      });

      return {
        success: true,
        data: schedule,
        message: 'Content schedule created successfully'
      };
    } catch (error) {
      return this.handleError('Failed to create content schedule', error);
    }
  }

  async getContentSchedules(qrCodeId: string): Promise<ServiceResponse<QRContentSchedule[]>> {
    try {
      this.validateQRCodeId(qrCodeId);

      const schedules = await this.dynamicQRRepository.findContentSchedulesByQRCode(qrCodeId);

      return {
        success: true,
        data: schedules,
        message: `Found ${schedules.length} content schedules`
      };
    } catch (error) {
      return this.handleError('Failed to get content schedules', error);
    }
  }

  async updateContentSchedule(
    scheduleId: string, 
    scheduleData: Partial<CreateContentScheduleRequest>
  ): Promise<ServiceResponse<QRContentSchedule>> {
    try {
      this.validateScheduleId(scheduleId);

      const updatedSchedule = await this.dynamicQRRepository.updateContentSchedule(scheduleId, scheduleData);

      return {
        success: true,
        data: updatedSchedule,
        message: 'Content schedule updated successfully'
      };
    } catch (error) {
      return this.handleError('Failed to update content schedule', error);
    }
  }

  async deleteContentSchedule(scheduleId: string): Promise<ServiceResponse<boolean>> {
    try {
      this.validateScheduleId(scheduleId);

      const deleted = await this.dynamicQRRepository.deleteContentSchedule(scheduleId);

      return {
        success: true,
        data: deleted,
        message: 'Content schedule deleted successfully'
      };
    } catch (error) {
      return this.handleError('Failed to delete content schedule', error);
    }
  }

  // ===============================================
  // ANALYTICS & STATISTICS
  // ===============================================

  async getDynamicQRStats(qrCodeId: string): Promise<ServiceResponse<DynamicQRStats>> {
    try {
      this.validateQRCodeId(qrCodeId);

      const stats = await this.dynamicQRRepository.getDynamicQRStats(qrCodeId);

      return {
        success: true,
        data: stats,
        message: 'Dynamic QR statistics retrieved successfully'
      };
    } catch (error) {
      return this.handleError('Failed to get dynamic QR statistics', error);
    }
  }

  async resolveRedirect(qrCodeId: string, context: {
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    region?: string;
    city?: string;
    sessionId?: string;
    timestamp?: string;
  }): Promise<ServiceResponse<string>> {
    try {
      this.validateQRCodeId(qrCodeId);

      let selectedVersion: QRContentVersion | null = null;
      let variant: 'A' | 'B' | undefined;
      let abTestId: string | undefined;
      let redirectRuleId: string | undefined;

      // Step 1: Check for active A/B tests
      const abTests = await this.dynamicQRRepository.findABTestsByQRCode(qrCodeId);
      const runningTest = abTests.find(test => test.status === 'running');

      if (runningTest) {
        // Determine variant based on traffic split and session
        const hash = this.hashString(context.sessionId || context.ipAddress || 'default');
        const isVariantA = (hash % 100) < runningTest.trafficSplit;
        
        variant = isVariantA ? 'A' : 'B';
        abTestId = runningTest.id;
        
        const versionId = isVariantA ? runningTest.variantAVersionId : runningTest.variantBVersionId;
        selectedVersion = await this.dynamicQRRepository.findContentVersionById(versionId);
      }

      // Step 2: Check redirect rules if no A/B test version
      if (!selectedVersion) {
        const rules = await this.dynamicQRRepository.findRedirectRulesByQRCode(qrCodeId);
        const enabledRules = rules.filter(rule => rule.isEnabled);

        for (const rule of enabledRules) {
          if (this.evaluateRedirectRule(rule, context)) {
            selectedVersion = await this.dynamicQRRepository.findContentVersionById(rule.targetVersionId);
            redirectRuleId = rule.id;
            break;
          }
        }
      }

      // Step 3: Check for scheduled content if no rule matched
      if (!selectedVersion) {
        const schedules = await this.dynamicQRRepository.findContentSchedulesByQRCode(qrCodeId);
        const activeSchedules = schedules.filter(schedule => 
          schedule.isActive && this.isScheduleActive(schedule, context.timestamp)
        );

        if (activeSchedules.length > 0) {
          // Use the most recently created active schedule
          const schedule = activeSchedules.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          
          selectedVersion = await this.dynamicQRRepository.findContentVersionById(schedule.versionId);
        }
      }

      // Step 4: Fall back to active version
      if (!selectedVersion) {
        selectedVersion = await this.dynamicQRRepository.getActiveContentVersion(qrCodeId);
      }

      if (!selectedVersion) {
        throw new BusinessLogicError('No active content version found for QR code');
      }

      // Record analytics
      await this.recordAnalytics(qrCodeId, selectedVersion.id, {
        abTestId,
        variant,
        redirectRuleId,
        ...context
      });

      // Return redirect URL
      const redirectUrl = selectedVersion.redirectUrl || this.getDefaultRedirectUrl(selectedVersion.content);

      return {
        success: true,
        data: redirectUrl,
        message: 'Redirect resolved successfully'
      };
    } catch (error) {
      return this.handleError('Failed to resolve redirect', error);
    }
  }

  // ===============================================
  // PRIVATE HELPER METHODS
  // ===============================================

  private async deactivateAllVersions(qrCodeId: string): Promise<void> {
    const versions = await this.dynamicQRRepository.findContentVersionsByQRCode(qrCodeId);
    const activeVersions = versions.filter(v => v.isActive);

    for (const version of activeVersions) {
      await this.dynamicQRRepository.updateContentVersion(version.id, { isActive: false });
    }
  }

  private async recordAnalytics(
    qrCodeId: string, 
    versionId: string, 
    context: any
  ): Promise<void> {
    try {
      const parser = new UAParser(context.userAgent);
      const result = parser.getResult();

      await this.dynamicQRRepository.recordDynamicAnalytics({
        qrCodeId,
        versionId,
        abTestId: context.abTestId,
        variant: context.variant,
        redirectRuleId: context.redirectRuleId,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        country: context.country,
        region: context.region,
        city: context.city,
        deviceType: result.device.type || 'desktop',
        browser: result.browser.name,
        os: result.os.name,
        referrer: context.referrer,
        sessionId: context.sessionId
      });
    } catch (error) {
      // Analytics recording should not fail the main operation
      console.error('Failed to record analytics:', error);
    }
  }

  private evaluateRedirectRule(rule: QRRedirectRule, context: any): boolean {
    const conditions = rule.conditions;

    switch (rule.ruleType) {
      case 'geographic':
        return this.evaluateGeographicRule(conditions, context);
      case 'device':
        return this.evaluateDeviceRule(conditions, context);
      case 'time':
        return this.evaluateTimeRule(conditions, context);
      case 'custom':
        return this.evaluateCustomRule(conditions, context);
      default:
        return false;
    }
  }

  private evaluateGeographicRule(conditions: any, context: any): boolean {
    if (conditions.countries && conditions.countries.length > 0) {
      return conditions.countries.includes(context.country);
    }
    if (conditions.regions && conditions.regions.length > 0) {
      return conditions.regions.includes(context.region);
    }
    if (conditions.cities && conditions.cities.length > 0) {
      return conditions.cities.includes(context.city);
    }
    return false;
  }

  private evaluateDeviceRule(conditions: any, context: any): boolean {
    if (!context.userAgent) return false;

    const parser = new UAParser(context.userAgent);
    const result = parser.getResult();

    if (conditions.deviceTypes && conditions.deviceTypes.length > 0) {
      const deviceType = result.device.type || 'desktop';
      if (!conditions.deviceTypes.includes(deviceType)) return false;
    }

    if (conditions.browsers && conditions.browsers.length > 0) {
      if (!conditions.browsers.includes(result.browser.name)) return false;
    }

    if (conditions.operatingSystems && conditions.operatingSystems.length > 0) {
      if (!conditions.operatingSystems.includes(result.os.name)) return false;
    }

    return true;
  }

  private evaluateTimeRule(conditions: any, context: any): boolean {
    const now = new Date(context.timestamp || new Date());
    
    if (conditions.timeRanges) {
      return conditions.timeRanges.some((range: any) => {
        const start = new Date(range.start);
        const end = new Date(range.end);
        return now >= start && now <= end;
      });
    }

    if (conditions.daysOfWeek) {
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      return conditions.daysOfWeek.includes(dayOfWeek);
    }

    if (conditions.hoursOfDay) {
      const hour = now.getHours();
      return conditions.hoursOfDay.includes(hour);
    }

    return false;
  }

  private evaluateCustomRule(conditions: any, context: any): boolean {
    // Implement custom rule evaluation logic here
    // This could include JavaScript evaluation, regex matching, etc.
    return false;
  }

  private isScheduleActive(schedule: QRContentSchedule, timestamp?: string): boolean {
    const now = new Date(timestamp || new Date());
    const startTime = new Date(schedule.startTime);
    
    if (now < startTime) return false;
    
    if (schedule.endTime) {
      const endTime = new Date(schedule.endTime);
      if (now > endTime) return false;
    }

    // Check repeat pattern
    if (schedule.repeatPattern !== 'none' && schedule.repeatDays) {
      const dayOfWeek = now.getDay();
      return schedule.repeatDays.includes(dayOfWeek);
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getDefaultRedirectUrl(content: any): string {
    if (typeof content === 'string') return content;
    if (content && content.url) return content.url;
    if (content && content.redirectUrl) return content.redirectUrl;
    return 'https://example.com'; // Default fallback
  }

  // ===============================================
  // VALIDATION METHODS
  // ===============================================

  private validateQRCodeId(qrCodeId: string): void {
    if (!qrCodeId || typeof qrCodeId !== 'string') {
      throw new ValidationError('Valid QR code ID is required');
    }
  }

  private validateVersionId(versionId: string): void {
    if (!versionId || typeof versionId !== 'string') {
      throw new ValidationError('Valid version ID is required');
    }
  }

  private validateTestId(testId: string): void {
    if (!testId || typeof testId !== 'string') {
      throw new ValidationError('Valid test ID is required');
    }
  }

  private validateRuleId(ruleId: string): void {
    if (!ruleId || typeof ruleId !== 'string') {
      throw new ValidationError('Valid rule ID is required');
    }
  }

  private validateScheduleId(scheduleId: string): void {
    if (!scheduleId || typeof scheduleId !== 'string') {
      throw new ValidationError('Valid schedule ID is required');
    }
  }

  private validateContentVersionData(data: CreateContentVersionRequest): void {
    if (!data.content) {
      throw new ValidationError('Content is required');
    }
  }

  private validateABTestData(data: CreateABTestRequest): void {
    if (!data.testName || data.testName.trim().length === 0) {
      throw new ValidationError('Test name is required');
    }
    if (!data.variantAVersionId || !data.variantBVersionId) {
      throw new ValidationError('Both variant versions are required');
    }
    if (data.variantAVersionId === data.variantBVersionId) {
      throw new ValidationError('Variants must be different versions');
    }
    if (data.trafficSplit !== undefined && (data.trafficSplit < 0 || data.trafficSplit > 100)) {
      throw new ValidationError('Traffic split must be between 0 and 100');
    }
  }

  private validateRedirectRuleData(data: CreateRedirectRuleRequest): void {
    if (!data.ruleName || data.ruleName.trim().length === 0) {
      throw new ValidationError('Rule name is required');
    }
    if (!data.ruleType) {
      throw new ValidationError('Rule type is required');
    }
    if (!data.conditions) {
      throw new ValidationError('Rule conditions are required');
    }
    if (!data.targetVersionId) {
      throw new ValidationError('Target version ID is required');
    }
  }

  private validateContentScheduleData(data: CreateContentScheduleRequest): void {
    if (!data.scheduleName || data.scheduleName.trim().length === 0) {
      throw new ValidationError('Schedule name is required');
    }
    if (!data.versionId) {
      throw new ValidationError('Version ID is required');
    }
    if (!data.startTime) {
      throw new ValidationError('Start time is required');
    }
  }

  private handleError(message: string, error: any): ServiceResponse<any> {
    console.error(message, error);
    
    if (error instanceof ValidationError || error instanceof BusinessLogicError) {
      return {
        success: false,
        data: null,
        error: error.message,
        message
      };
    }

    return {
      success: false,
      data: null,
      error: 'Internal server error',
      message
    };
  }
}