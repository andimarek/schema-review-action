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
};


export type MutationCreateGitHubCheckArgs = {
  input: CreateGitHubCheckPayload
};


export type MutationNewSchemaVersionGitHubArgs = {
  input: NewSchemaVersionGitHubPayload
};

export type NewSchemaVersionGitHubPayload = {
  repoId: Scalars['ID'],
  repoOwner: Scalars['String'],
  repoName: Scalars['String'],
  sha: Scalars['String'],
  schema: Scalars['String']
};

export type NewSchemaVersionGitHubResponse = {
   __typename?: 'NewSchemaVersionGitHubResponse',
  success?: Maybe<Scalars['Boolean']>,
  message?: Maybe<Scalars['String']>,
};

export type Query = {
   __typename?: 'Query',
  rules?: Maybe<Array<Maybe<RuleDescription>>>,
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
