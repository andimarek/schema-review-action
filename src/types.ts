export type Maybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string,
  String: string,
  Boolean: boolean,
  Int: number,
  Float: number,
};

export type CreateGitHubCheckForPrResponse = {
   __typename?: 'CreateGitHubCheckForPRResponse',
  success?: Maybe<Scalars['Boolean']>,
  message?: Maybe<Scalars['String']>,
};

export type CreateGitHubCheckPayload = {
  secret: Scalars['ID'],
  repoId: Scalars['ID'],
  repoOwner: Scalars['String'],
  repoName: Scalars['String'],
  prNumber: Scalars['String'],
  headSha: Scalars['String'],
  baseSha: Scalars['String'],
  schema: Scalars['String'],
  configFile: Scalars['String'],
};

export type Mutation = {
   __typename?: 'Mutation',
  createGitHubCheck?: Maybe<CreateGitHubCheckForPrResponse>,
  newSchemaVersionGitHub?: Maybe<NewSchemaVersionGitHubResponse>,
  registerNewRepo?: Maybe<RegisterNewRepoResponse>,
  newSchemaVersion?: Maybe<NewSchemaVersionResponse>,
  reviewSchema?: Maybe<ReviewSchemaResponse>,
};


export type MutationCreateGitHubCheckArgs = {
  input: CreateGitHubCheckPayload
};


export type MutationNewSchemaVersionGitHubArgs = {
  input: NewSchemaVersionGitHubPayload
};


export type MutationRegisterNewRepoArgs = {
  input: RegisterNewRepoPayload
};


export type MutationNewSchemaVersionArgs = {
  input: NewSchemaVersionPayload
};


export type MutationReviewSchemaArgs = {
  input: ReviewSchemaPayload
};

export type NewSchemaVersionGitHubPayload = {
  secret: Scalars['ID'],
  repoId: Scalars['ID'],
  repoOwner: Scalars['String'],
  repoName: Scalars['String'],
  sha: Scalars['String'],
  schema: Scalars['String'],
};

export type NewSchemaVersionGitHubResponse = {
   __typename?: 'NewSchemaVersionGitHubResponse',
  success?: Maybe<Scalars['Boolean']>,
  message?: Maybe<Scalars['String']>,
};

export type NewSchemaVersionPayload = {
  secretId?: Maybe<Scalars['ID']>,
  sha: Scalars['String'],
  schema: Scalars['String'],
};

export type NewSchemaVersionResponse = {
   __typename?: 'NewSchemaVersionResponse',
  success?: Maybe<Scalars['Boolean']>,
  message?: Maybe<Scalars['String']>,
};

export type Query = {
   __typename?: 'Query',
  rules?: Maybe<Array<Maybe<RuleDescription>>>,
};

export type RegisterNewRepoPayload = {
  name?: Maybe<Scalars['String']>,
};

export type RegisterNewRepoResponse = {
   __typename?: 'RegisterNewRepoResponse',
  success?: Maybe<Scalars['Boolean']>,
  message?: Maybe<Scalars['String']>,
  secretRepoId?: Maybe<Scalars['ID']>,
};

export type ReviewRuleResult = {
   __typename?: 'ReviewRuleResult',
  severity?: Maybe<RuleResultSeverity>,
  message?: Maybe<Scalars['String']>,
  ruleName?: Maybe<Scalars['String']>,
  line?: Maybe<Scalars['Int']>,
};

export type ReviewSchemaPayload = {
  secretId?: Maybe<Scalars['ID']>,
  headSha: Scalars['String'],
  baseSha: Scalars['String'],
  schema: Scalars['String'],
  configFile: Scalars['String'],
};

export type ReviewSchemaResponse = {
   __typename?: 'ReviewSchemaResponse',
  success?: Maybe<Scalars['Boolean']>,
  message?: Maybe<Scalars['String']>,
  reviewAsMarkdown?: Maybe<Scalars['String']>,
  ruleResults?: Maybe<Array<ReviewRuleResult>>,
};

export type RuleConfigDescription = {
   __typename?: 'RuleConfigDescription',
  name?: Maybe<Scalars['String']>,
  description?: Maybe<Scalars['String']>,
};

export type RuleDescription = {
   __typename?: 'RuleDescription',
  name?: Maybe<Scalars['String']>,
  description?: Maybe<Scalars['String']>,
  configs?: Maybe<Array<RuleConfigDescription>>,
};

export enum RuleResultSeverity {
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR'
}
