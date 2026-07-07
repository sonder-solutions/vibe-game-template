import type { ISecurityService } from '../services/interfaces/ISecurityService.js';

export class ScoreSubmission {
  #securityService: ISecurityService;

  constructor(securityService: ISecurityService) {
    this.#securityService = securityService;
  }

  async initialize(): Promise<void> {
    await this.#securityService.initialize();
  }

  encrypt(data: { score: number; time: number; name: string; uuid?: string }): string {
    return this.#securityService.encrypt(data);
  }

  formatForIssue(data: { score: number; time: number; name: string; uuid?: string }): string {
    const encrypted = this.encrypt(data);
    return `## Submission\n\nENCRYPTED_PAYLOAD:\n\n\`\`\`\n${encrypted}\n\`\`\``;
  }
}
