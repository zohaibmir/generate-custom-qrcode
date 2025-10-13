import { randomBytes } from 'crypto';
import { IShortIdGenerator } from '../interfaces';

export class ShortIdGenerator implements IShortIdGenerator {
  private readonly alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private readonly length = 8;

  async generate(): Promise<string> {
    const bytes = randomBytes(this.length);
    let result = '';
    
    for (let i = 0; i < this.length; i++) {
      result += this.alphabet[bytes[i] % this.alphabet.length];
    }
    
    return result;
  }

  validate(shortId: string): boolean {
    if (shortId.length !== this.length) {
      return false;
    }
    
    return shortId.split('').every(char => this.alphabet.includes(char));
  }
}