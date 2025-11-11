import { PriceRule, PriceCondition } from '@qr-saas/shared';
import { ILogger } from '../interfaces';

interface PricingContext {
  quantity?: number;
  userTier?: 'free' | 'pro' | 'business' | 'enterprise';
  currentTime?: Date;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  isFirstTimeBuyer?: boolean;
  customerType?: 'new' | 'returning';
  [key: string]: any;
}

export class PricingEngine {
  constructor(private readonly logger: ILogger) {}

  async calculatePrice(basePrice: number, rules: PriceRule[], context: PricingContext = {}): Promise<number> {
    try {
      if (!rules || rules.length === 0) {
        return basePrice;
      }

      let finalPrice = basePrice;
      const activeRules = rules
        .filter(rule => rule.isActive && this.isRuleValid(rule))
        .sort((a, b) => a.priority - b.priority);

      for (const rule of activeRules) {
        const conditionsMet = await this.evaluateConditions(rule.conditions, context);
        
        if (conditionsMet) {
          finalPrice = this.applyPriceRule(finalPrice, rule);
          
          this.logger.info('Price rule applied', {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.type,
            originalPrice: basePrice,
            newPrice: finalPrice,
            ruleValue: rule.value
          });
        }
      }

      // Ensure price doesn't go below 0
      finalPrice = Math.max(0, finalPrice);
      
      return finalPrice;
    } catch (error) {
      this.logger.error('Failed to calculate price', {
        error: error instanceof Error ? error.message : 'Unknown error',
        basePrice,
        rulesCount: rules.length,
        context
      });
      
      // Return original price if calculation fails
      return basePrice;
    }
  }

  async validatePriceRules(rules: PriceRule[]): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      for (const rule of rules) {
        // Validate rule structure
        if (!rule.id || !rule.name || !rule.type) {
          errors.push(`Rule ${rule.id || 'unknown'}: Missing required fields (id, name, type)`);
          continue;
        }

        // Validate rule type and value
        if (!['percentage', 'fixed', 'bulk_discount'].includes(rule.type)) {
          errors.push(`Rule ${rule.id}: Invalid rule type '${rule.type}'`);
        }

        if (typeof rule.value !== 'number' || rule.value < 0) {
          errors.push(`Rule ${rule.id}: Invalid rule value '${rule.value}'`);
        }

        // Validate percentage rules
        if (rule.type === 'percentage' && rule.value > 100) {
          errors.push(`Rule ${rule.id}: Percentage value cannot exceed 100%`);
        }

        // Validate priority
        if (typeof rule.priority !== 'number') {
          errors.push(`Rule ${rule.id}: Priority must be a number`);
        }

        // Validate date ranges
        if (rule.validFrom && rule.validTo) {
          const validFrom = new Date(rule.validFrom);
          const validTo = new Date(rule.validTo);
          
          if (validFrom >= validTo) {
            errors.push(`Rule ${rule.id}: Valid from date must be before valid to date`);
          }
        }

        // Validate conditions
        if (rule.conditions && Array.isArray(rule.conditions)) {
          for (let i = 0; i < rule.conditions.length; i++) {
            const condition = rule.conditions[i];
            const conditionErrors = this.validateCondition(condition);
            
            if (conditionErrors.length > 0) {
              errors.push(`Rule ${rule.id}, Condition ${i}: ${conditionErrors.join(', ')}`);
            }
          }
        }
      }

      // Check for duplicate priorities
      const priorities = rules.map(r => r.priority);
      const uniquePriorities = [...new Set(priorities)];
      
      if (priorities.length !== uniquePriorities.length) {
        errors.push('Duplicate rule priorities detected. Each rule should have a unique priority.');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      this.logger.error('Failed to validate price rules', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rulesCount: rules.length
      });
      
      return {
        isValid: false,
        errors: ['Failed to validate price rules: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  async evaluateConditions(conditions: PriceCondition[], context: PricingContext): Promise<boolean> {
    try {
      if (!conditions || conditions.length === 0) {
        return true; // No conditions means rule always applies
      }

      // All conditions must be true (AND logic)
      for (const condition of conditions) {
        const result = this.evaluateCondition(condition, context);
        if (!result) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to evaluate conditions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conditionsCount: conditions.length,
        context
      });
      
      return false;
    }
  }

  private isRuleValid(rule: PriceRule): boolean {
    const now = new Date();
    
    if (rule.validFrom && new Date(rule.validFrom) > now) {
      return false;
    }
    
    if (rule.validTo && new Date(rule.validTo) < now) {
      return false;
    }
    
    return true;
  }

  private applyPriceRule(currentPrice: number, rule: PriceRule): number {
    switch (rule.type) {
      case 'percentage':
        return currentPrice * (1 - rule.value / 100);
      
      case 'fixed':
        return currentPrice - rule.value;
      
      case 'bulk_discount':
        // For bulk discount, value represents discount percentage for bulk quantities
        return currentPrice * (1 - rule.value / 100);
      
      default:
        this.logger.warn('Unknown price rule type', { ruleType: rule.type });
        return currentPrice;
    }
  }

  private evaluateCondition(condition: PriceCondition, context: PricingContext): boolean {
    try {
      const contextValue = this.getContextValue(condition.type, context);
      
      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value;
        
        case 'greater_than':
          return typeof contextValue === 'number' && contextValue > condition.value;
        
        case 'less_than':
          return typeof contextValue === 'number' && contextValue < condition.value;
        
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(contextValue);
        
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(contextValue);
        
        default:
          this.logger.warn('Unknown condition operator', { operator: condition.operator });
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to evaluate condition', {
        error: error instanceof Error ? error.message : 'Unknown error',
        condition,
        context
      });
      
      return false;
    }
  }

  private getContextValue(conditionType: string, context: PricingContext): any {
    switch (conditionType) {
      case 'quantity':
        return context.quantity || 0;
      
      case 'user_tier':
        return context.userTier || 'free';
      
      case 'time_range':
        return context.currentTime || new Date();
      
      case 'location':
        return context.location?.country || '';
      
      case 'first_time_buyer':
        return context.isFirstTimeBuyer || false;
      
      default:
        return context[conditionType];
    }
  }

  private validateCondition(condition: PriceCondition): string[] {
    const errors: string[] = [];
    
    if (!condition.type) {
      errors.push('Missing condition type');
    }
    
    if (!condition.operator) {
      errors.push('Missing condition operator');
    }
    
    if (!['equals', 'greater_than', 'less_than', 'in', 'not_in'].includes(condition.operator)) {
      errors.push(`Invalid operator '${condition.operator}'`);
    }
    
    if (condition.value === undefined || condition.value === null) {
      errors.push('Missing condition value');
    }
    
    // Validate specific condition types
    if (condition.type === 'quantity' && typeof condition.value !== 'number') {
      errors.push('Quantity condition value must be a number');
    }
    
    if (condition.type === 'user_tier' && !['free', 'pro', 'business', 'enterprise'].includes(condition.value)) {
      errors.push('Invalid user tier value');
    }
    
    if (['in', 'not_in'].includes(condition.operator) && !Array.isArray(condition.value)) {
      errors.push('In/not_in operators require array value');
    }
    
    return errors;
  }
}