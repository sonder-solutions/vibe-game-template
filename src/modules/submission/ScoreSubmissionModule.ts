import type { ISecurityService } from '../../services/interfaces/ISecurityService.js';
import type { ScoreSubmissionConfig, ScoreData, SubmissionResult } from './ScoreSubmissionModule.types.js';

export class ScoreSubmissionModule {
  #config: ScoreSubmissionConfig;
  #securityService: ISecurityService;

  constructor(config: ScoreSubmissionConfig, securityService: ISecurityService) {
    this.#config = config;
    this.#securityService = securityService;
  }

  async initialize(): Promise<void> {
    await this.#securityService.initialize();
  }

  async submit(data: ScoreData): Promise<SubmissionResult> {
    const encrypted = this.#securityService.encrypt(data);
    const issueBody = `## Submission\n\nENCRYPTED_PAYLOAD:\n\n\`\`\`\n${encrypted}\n\`\`\``;

    const title = this.#config.titleTemplate
      .replace('{score}', String(data.score))
      .replace('{time}', String(data.time))
      .replace('{name}', data.name)
      .replace('{uuid}', data.uuid || '');

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.#config.repoOwner}/${this.#config.repoName}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.#config.githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            body: issueBody,
          }),
        }
      );

      if (response.ok) {
        const issue = await response.json();
        return {
          success: true,
          issueNumber: issue.number,
          issueUrl: issue.html_url
        };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}
