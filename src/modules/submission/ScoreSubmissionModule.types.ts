export interface ScoreSubmissionConfig {
  githubToken: string;
  repoOwner: string;
  repoName: string;
  titleTemplate: string;
}

export interface ScoreData {
  score: number;
  time: number;
  name: string;
  uuid?: string;
}

export interface SubmissionResult {
  success: boolean;
  issueNumber?: number;
  issueUrl?: string;
  error?: string;
}
